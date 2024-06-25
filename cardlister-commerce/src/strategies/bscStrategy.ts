import {
  AbstractBatchJobStrategy,
  BatchJobService,
  CreateBatchJobInput,
  Logger,
  Product,
  ProductCategory,
  ProductCategoryService,
  ProductVariantService,
} from '@medusajs/medusa';
import { EntityManager } from 'typeorm';
import { remote } from 'webdriverio';
import { IInventoryService } from '@medusajs/types';
import { InventoryService } from '@medusajs/inventory/dist/services';
import axios, { AxiosInstance } from 'axios';
import axiosRetry from 'axios-retry';
import { getAvailableQuantity, getRegionPrice } from '../utils/data';
import FormData from 'form-data';

type InjectedDependencies = {
  batchJobService: BatchJobService;
  productCategoryService: ProductCategoryService;
  manager: EntityManager;
  transactionManager: EntityManager;
  productVariantService: ProductVariantService;
  inventoryService: InventoryService;
  logger: Logger;
};

class BscStrategy extends AbstractBatchJobStrategy {
  static identifier = 'bsc-strategy';
  static batchType = 'bsc-sync';
  protected batchJobService_: BatchJobService;
  protected categoryService_: ProductCategoryService;
  protected productVariantService_: ProductVariantService;
  private readonly inventoryModule: IInventoryService;
  private readonly logger: Logger;

  protected constructor(
    __container__: InjectedDependencies,
    __configModule__?: Record<string, unknown> | undefined,
    __moduleDeclaration__?: Record<string, unknown> | undefined,
  ) {
    let log: Logger | undefined;
    try {
      super(arguments[0]);
      log = __container__.logger;
      this.logger = log;
      this.batchJobService_ = __container__.batchJobService || this.batchJobService_;
      this.categoryService_ = __container__.productCategoryService;
      this.productVariantService_ = __container__.productVariantService;
      this.inventoryModule = __container__.inventoryService;
    } catch (e) {
      log ? log.error('sportlots::constructor::error', e) : console.log('error', e);
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
                key: 'bsc-update-count',
                name: 'Number of products to publish to bsc',
                message: `${count} product(s) will be published.`,
              },
            ],
          },
        });
      });
    } catch (e) {
      this.logger.error('bsc::preProcessBatchJob::error', e);
    }
  }

  async processJob(batchJobId: string): Promise<void> {
    try {
      return await this.atomicPhase_(async (transactionManager) => {
        const batchJob = await this.batchJobService_.withTransaction(transactionManager).retrieve(batchJobId);

        const category: ProductCategory = await this.categoryService_.retrieve(batchJob.context.category_id as string, {
          relations: ['products', 'products.variants', 'products.variants.prices', 'products.images'],
        });
        const productList: Product[] = category.products;

        await this.syncProductsToBSC(productList, category);

        await this.batchJobService_.withTransaction(transactionManager).update(batchJobId, {
          result: {
            advancement_count: productList.length,
          },
        });
      });
    } catch (e) {
      this.logger.error('bsc::processJob::error', e);
    }
  }

  private _api: AxiosInstance;

  async login() {
    if (!this._api) {
      const browser = await remote({
        capabilities: {
          browserName: 'chrome',
          'goog:chromeOptions': {
            args: ['headless', 'disable-gpu', '--window-size=1200,2000'],
          },
        },
        logLevel: 'error',
      });

      try {
        await browser.url('https://www.buysportscards.com');
        const signInButton = await browser.$('.=Sign In');
        await signInButton.waitForClickable({ timeout: 10000 });
        await signInButton.click();

        const emailInput = await browser.$('#signInName');
        await emailInput.waitForExist({ timeout: 5000 });
        await emailInput.setValue(process.env.BSC_EMAIL);
        await browser.$('#password').setValue(process.env.BSC_PASSWORD);

        await browser.$('#next').click();

        await browser.$('.=welcome back,').waitForExist({ timeout: 10000 });

        const reduxAsString: string = await browser.execute(
          'return Object.values(localStorage).filter((value) => value.includes("secret")).find(value=>value.includes("Bearer"));',
        );
        const redux = JSON.parse(reduxAsString);

        this._api = axios.create({
          baseURL: 'https://api-prod.buysportscards.com/',
          headers: {
            accept: 'application/json, text/plain, */*',
            'accept-language': 'en-US,en;q=0.9',
            assumedrole: 'sellers',
            'content-type': 'application/json',
            origin: 'https://www.buysportscards.com',
            referer: 'https://www.buysportscards.com/',
            'Sec-Ch-Ua': '"Not_A Brand";v="8", "Chromium";v="120", "Google Chrome";v="120"',
            'Sec-Ch-Ua-Mobile': '?0',
            'Sec-Ch-Ua-Platform': 'macOS',
            'Sec-Fetch-Dest': 'empty',
            'Sec-Fetch-Mode': 'cors',
            'Sec-Fetch-Site': 'same-site',
            authority: 'api-prod.buysportscards.com',
            authorization: `Bearer ${redux.secret.trim()}`,
          },
        });
      } finally {
        await browser.saveScreenshot('.error.png');
        await browser.shutdown();
      }

      axiosRetry(this._api, { retries: 5, retryDelay: axiosRetry.exponentialDelay });
    }
    return this._api;
  }

  async postImage(image: string) {
    const formData = new FormData();

    const response = await axios.get(
      `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${image}?alt=media`,
      { responseType: 'stream' },
    );
    formData.append('attachment', response.data, image);
    const formHeaders = formData.getHeaders();

    const api = await this.login();
    const { data: results } = await api.post(
      `https://api-prod.buysportscards.com/common/card/undefined/product/undefined/attachment`,
      formData,
      {
        headers: {
          ...formHeaders,
          'Content-Type': 'multipart/form-data',
        },
      },
    );
    if (results.objectKey) {
      return results.objectKey;
    } else {
      this.logger.error('error uploading image', results); //TODO need to log this somewhere actionable
    }
  }

  async syncProductsToBSC(products: Product[], category: ProductCategory): Promise<void> {
    const activityId = this.logger.activity('bsc::syncProductsTobsc');
    try {
      const api = await this.login();

      const response = await api.post('seller/bulk-upload/results', {
        condition: 'near_mint',
        currentListings: true,
        productType: 'raw',
        ...(category.metadata.bsc as object),
      });
      const listings = response.data.results;

      const updates = [];

      for (let listing of listings) {
        const product = products.find((product) => `${product.metadata.cardNumber}` === `${listing.card.cardNo}`);
        if (product) {
          const variant = product?.variants[0]; //TODO This will need to handle multiple variants
          const quantity = await getAvailableQuantity(variant.sku, this.inventoryModule); //TODO assumes no variations exist

          if (quantity !== listing.availableQuantity || (listing.sellerSku && listing.sellerSku !== variant.sku)) {
            this.logger.progress(activityId, `bsc::Adding::${variant.sku}`);
            let newListing: any = {
              ...listing,
              availableQuantity: quantity,
              price: getRegionPrice(variant, 'reg_01HZT9X5DVJXTYW5CE0SG6908V'),
              sellerSku: variant.sku,
            };

            // TODO Fix images
            if (product.images) {
              const images = product.images.map((image) => image.url).sort();
              if (images.length > 0 && (!listing.sellerImgFront || listing.sellerImgFront.indexOf('Default') > -1)) {
                this.logger.progress(activityId, `bsc::Adding::${variant.sku}::Front Image`);
                newListing.sellerImgFront = await this.postImage(`${images[0]}`);
              }
              if (images.length > 1 && (!listing.sellerImgBack || listing.sellerImgBack.indexOf('Default') > -1)) {
                this.logger.progress(activityId, `bsc::Adding::${variant.sku}::Back Image`);
                newListing.sellerImgBack = await this.postImage(`${images[1]}`);
              }
            }
            updates.push(newListing);
          }
        } else {
          this.logger.error('bsc::syncProductsTobsc::product not found', listing.card.cardNo); //TODO need to log this somewhere actionable
        }
      }

      if (updates.length > 0) {
        const { data: results } = await api.put('seller/bulk-upload', {
          sellerId: 'cf987f7871',
          listings: updates,
        });
        if (results.result === 'Saved!') {
          this.logger.success(activityId, `bsc::syncProductsTobsc::${results.result} ${updates.length}`);
        } else {
          throw new Error(results);
        }
      } else {
        this.logger.success(activityId, 'bsc::syncProductsTobsc::no updates to make');
      }
    } catch (e) {
      this.logger.error('bsc::syncProductsTobsc::error', e?.response?.data || e?.data || e);
      this.logger.failure(activityId, 'bsc::syncProductsTobsc::error');
    }
  }
}

export default BscStrategy;
