import {
  AbstractBatchJobStrategy,
  BatchJobService,
  CreateBatchJobInput,
  Product,
  ProductCategory,
  ProductCategoryService,
  ProductVariantService,
} from '@medusajs/medusa';
import { EntityManager } from 'typeorm';
import { Locator, until, WebDriver } from 'selenium-webdriver';
import { remote } from 'webdriverio';
import { IInventoryService } from '@medusajs/types';
import { InventoryService } from '@medusajs/inventory/dist/services';

type InjectedDependencies = {
  batchJobService: BatchJobService;
  productCategoryService: ProductCategoryService;
  manager: EntityManager;
  transactionManager: EntityManager;
  productVariantService: ProductVariantService;
  inventoryService: InventoryService;
};

class SportlotsStrategy extends AbstractBatchJobStrategy {
  static identifier = 'sportlots-strategy';
  static batchType = 'sportlots-sync';
  protected batchJobService_: BatchJobService;
  protected categoryService_: ProductCategoryService;
  protected productVariantService_: ProductVariantService;
  private inventoryModule: IInventoryService;

  protected _driver: WebDriver;
  protected clickSubmit: (text?: string) => Promise<void>;
  protected click: (locator: Locator | Locator[] | string) => Promise<void>;
  private browser: WebdriverIO.Browser;

  protected constructor(
    __container__: InjectedDependencies,
    __configModule__?: Record<string, unknown> | undefined,
    __moduleDeclaration__?: Record<string, unknown> | undefined,
  ) {
    try {
      super(arguments[0]);
      this.batchJobService_ = __container__.batchJobService || this.batchJobService_;
      this.categoryService_ = __container__.productCategoryService;
      this.productVariantService_ = __container__.productVariantService;
      this.inventoryModule = __container__.inventoryService;
      // this.inventoryItemService_ = __container__.inventoryItemService;
    } catch (e) {
      console.log('error', e);
    }
  }

  async buildTemplate(): Promise<string> {
    return '';
  }

  async prepareBatchJobForProcessing(
    batchJob: CreateBatchJobInput,
    req: Express.Request,
  ): Promise<CreateBatchJobInput> {
    // make changes to the batch job's fields...
    return batchJob;
  }

  async preProcessBatchJob(batchJobId: string): Promise<void> {
    try {
      return await this.atomicPhase_(async (transactionManager) => {
        const batchJob = await this.batchJobService_.withTransaction(transactionManager).retrieve(batchJobId);

        const category = await this.categoryService_
          .withTransaction(transactionManager)
          .retrieve(batchJob.context.category_id as string, { relations: ['products'] });
        const count = category.products.length;

        await this.batchJobService_.withTransaction(transactionManager).update(batchJob, {
          result: {
            advancement_count: 0,
            count,
            stat_descriptors: [
              {
                key: 'sportlots-update-count',
                name: 'Number of products to publish to sportlots',
                message: `${count} product(s) will be published.`,
              },
            ],
          },
        });
      });
    } catch (e) {
      console.log('sportlots::preProcessBatchJob::error', e);
    }
  }

  async processJob(batchJobId: string): Promise<void> {
    try {
      return await this.atomicPhase_(async (transactionManager) => {
        const batchJob = await this.batchJobService_.withTransaction(transactionManager).retrieve(batchJobId);

        const category: ProductCategory = await this.categoryService_.retrieve(batchJob.context.category_id as string, {
          relations: ['products', 'products.variants'],
        });
        const productList: Product[] = category.products;

        await this.syncProductsToSportlots(productList, category);

        await this.batchJobService_.withTransaction(transactionManager).update(batchJobId, {
          result: {
            advancement_count: productList.length,
          },
        });
      });
    } catch (e) {
      console.log('sportlots::processJob::error', e);
    }
  }

  async login() {
    if (!this.browser) {
      this.browser = await remote({
        capabilities: {
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: process.env.CI ? ['headless', 'disable-gpu'] : [],
          },
        },
      });

      await this.browser.url('https://www.sportlots.com/cust/custbin/login.tpl?urlval=/index.tpl&qs=');
      await this.browser.$('input[name="email_val"]').setValue(process.env.SPORTLOTS_ID);
      await this.browser.$('input[name="psswd"]').setValue(process.env.SPORTLOTS_PASS);
      await this.browser.$('input[value="Sign-in"]').click();
    }
    return this.browser;
  }

  async removeAllInventory(category: ProductCategory): Promise<void> {
    try {
      await this.login();
      await this._driver.get(
        `https://www.sportlots.com/inven/dealbin/setdetail.tpl?Set_id=${category.metadata.sportlots}`,
      );
      await this.clickSubmit('Delete All Set Inventory');
      await this._driver.wait(until.alertIsPresent());
      const alert = await this._driver.switchTo().alert();
      await alert.accept();
      await this._driver.switchTo().defaultContent();
      await this._driver.get(
        `https://www.sportlots.com/inven/dealbin/setdetail.tpl?Set_id=${category.metadata.sportlots}`,
      );
    } catch (e) {
      console.log('sportlots::removeAllInventory::error', e);
    }
  }

  async loadAddInventoryScreen(year: string, brand: string, sport: string): Promise<void> {
    const browser = await this.login();
    await browser.url('https://www.sportlots.com/inven/dealbin/newinven.tpl');
    await browser.$('select[name="yr"]').selectByAttribute('value', year);
    await browser.$('select[name="brd"]').selectByAttribute('value', brand);
    await browser.$('select[name="sprt"]').selectByAttribute(
      'value',
      {
        baseball: 'BB',
        football: 'FB',
        basketball: 'BK',
      }[sport.toLowerCase()],
    );
    await browser.$('aria/Default to new pricing').click();
    await browser.$('input[value="Next"').click();
  }

  async selectSet(setId: string) {
    const browser = await this.login();
    await browser.waitUntil(async () => (await browser.getUrl()).match(/dealsets.tpl/));
    await browser.$(`input[name="selset"][value="${setId}"]`).click();
    await browser.$('input[value="Get Cards"').click();
  }

  async setInventory(products: Product[], category: ProductCategory): Promise<void> {
    try {
      const browser = await this.login();

      //first clear out the inventory
      await this.removeAllInventory(category);

      //now navigate to the add inventory screen and add it all back
      await this.loadAddInventoryScreen(
        category.metadata.year as string,
        category.metadata.brand as string,
        category.metadata.sport as string,
      );

      await this.selectSet(category.metadata.sportlots as string);

      const processPage = async () => {
        let expectedAdds = 0;

        const rows = await browser
          .$('body > div > table:nth-child(2) > tbody > tr > td > form > table > tbody')
          .$$('tr:has(td):not(:has(th))');
        for (const row of rows) {
          const cardNumber = await row.$('td:nth-child(2)').getText();
          if (!isNaN(parseInt(cardNumber))) {
            console.log('sportlots::Checking Card Number', cardNumber);
            const product = products.find((p) => p.metadata.cardNumber === cardNumber);
            const variant = product?.variants[0]; //TODO This will need to handle multiple variants
            if (variant) {
              const [inventoryItems] = await this.inventoryModule.listInventoryItems({ sku: variant.sku });
              const quantityFromService = await this.inventoryModule.retrieveAvailableQuantity(inventoryItems[0].id, [
                'sloc_01HWNYZ3G2K7WEKZ3SAB7VJFK0', //TODO This will need to be dynamic
              ]);
              const quantity = isNaN(quantityFromService) ? 0 : quantityFromService;

              console.log(`sportlots::Setting Inventory for ${variant.sku} to ${quantity}`);
              if (quantity > 0) {
                await row.$('td:nth-child(1) > input').setValue(quantity);

                await row.$('td:nth-child(4) > input').setValue(
                  (await this.productVariantService_.getRegionPrice(variant.id, {
                    regionId: 'reg_01HZT9WHCPTM6Z8FSQG0EXZ5SK',
                  })) / 100,
                );
                expectedAdds += quantity;
              }
            }
          }
        }

        await browser.$('input[value="Inventory Cards"').click();
        const banner = await browser.$('h2.message').getText();
        const resultCount = parseInt(banner.replace('  cards added', ''));
        if (resultCount == expectedAdds) {
          console.log('sportlots::Set Successfully added:', expectedAdds);
        } else {
          throw new Error(`sportlots::Failed. Uploaded ${resultCount} cards but expected ${expectedAdds} cards.`);
        }

        //keep processing while there are more pages
        if (await browser.$('td=Skip to Page:').isExisting()) {
          await processPage();
        }
      };

      //process at least once
      await processPage();

      await this.browser.pause(10000);
    } catch (e) {
      console.log('sportlots::setInventory::error', e);
    }
  }

  async syncProductsToSportlots(products: Product[], category: ProductCategory): Promise<void> {
    try {
      await this.login();

      // await this.removeAllInventory(category);
      //
      await this.setInventory(products, category);
    } catch (e) {
      console.log('sportlots::syncProductsToSportlots::error', e);
    } finally {
      await this.browser.shutdown();
    }
  }
}

export default SportlotsStrategy;
