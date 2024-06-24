import {
  Logger,
  Product,
  ProductService,
  ProductVariantService,
  type SubscriberArgs,
  type SubscriberConfig,
} from '@medusajs/medusa';
import { remote } from 'webdriverio';
import axios from 'axios';
import * as fs from 'node:fs';

export default async function mcpHandler({
  data,
  eventName,
  container,
  pluginOptions,
}: SubscriberArgs<Record<string, any>>) {
  let mcp: WebdriverIO.Browser;
  let logger: Logger;
  try {
    logger = container.resolve<Logger>('logger');
    const { variantId, price, quantity } = data;
    const activityId = logger.activity(`MCP Listing Update for ${variantId}: ${quantity}`);
    const logProgress = (text: string) =>
      logger.progress(activityId, `MCP Listing Update for ${product.title} [${productVariant.sku}] :: ${text}`);

    const productVariantService: ProductVariantService = container.resolve('productVariantService');
    const productService: ProductService = container.resolve('productService');

    const productVariant = await productVariantService.retrieve(variantId);
    const product: Product = await productService.retrieve(productVariant.product_id, {
      relations: ['categories', 'images'],
    });
    const category = product.categories[0];

    logProgress(`Logging into MCP...`);
    mcp = await login();

    logProgress('Getting Site Counts...');
    let siteCount: number;
    const countFiled = await mcp.$('h2.card-count');
    const showingAll = await countFiled.getText();
    let allCount = parseInt(showingAll.replace(/[^0-9]/g, ''));
    const updateSiteCount = async (isAll: boolean): Promise<number> => {
      await countFiled.waitUntil(async () => {
        const countText = await countFiled.getText();
        siteCount = parseInt(countText.replace(/[^0-9]/g, ''));
        return isAll ? siteCount === allCount : siteCount !== allCount;
      });
      return siteCount;
    };
    await updateSiteCount(true);

    logProgress('Searching for Card...');
    const search = await mcp.$('input[type="text"][placeholder="Search Cards"]');
    await search.setValue(`[${productVariant.sku}]`);
    await updateSiteCount(false);

    //if quantity is 0, remove the product from MCP if necessary
    if (quantity === 0) {
      if (siteCount > 0) {
        await mcp.$('=Delete').click();
        await mcp.$('=Yes').click();
        allCount--;
        await updateSiteCount(true);
        logProgress('Removing Card from MCP...');
        logger.info(`mcp::Removed ${productVariant.sku} from MCP`);
      } else {
        logger.info(`mcp::${productVariant.sku} not found on MCP`);
      }
    } else {
      if (siteCount === 0) {
        logProgress('Adding Card to MCP...');
        await mcp.$('button=Add Card').click();
        const form = await mcp.$('//form[@action="https://mycardpost.com/add-card"]');
        const frontImage = await tempImage(product.images[0].url);
        await form.$('#front_image').setValue(frontImage);
        const backImage = await tempImage(product.images[1].url);
        await form.$('#back_image').setValue(backImage);
        await form.$('textarea[name="name"]').setValue(`${product.title} [${productVariant.sku}]`);
        await form.$('input[name="price"]').setValue(price === 99 ? 1 : price / 100);
        await form.$('select[name="sport"]').selectByVisibleText(category.metadata.sport as string);
        for (const team of product.metadata.teams as string[]) {
          await form.$(`//span[@role='textbox' and @data-placeholder='Type something']`).setValue(team);
        }
        const typeSelect = await form.$('#card_type');
        // TODO this doesn't exist yet
        // if (productVariant.metadata.graded) {
        //   await typeSelect.selectByVisibleText('Graded');
        //   await form.$('#professional_grader').setValue(productVariant.metadata.grader as string);
        //   await form.$('#grade').setValue(productVariant.metadata.grade as string);
        // } else {
        await typeSelect.selectByVisibleText('Raw');
        // }
        const features: string[] = (product.metadata.features as string[])?.map((f) => f.toLowerCase()) || [];
        const featureInput = await form.$('#attribute_name');
        if (features.includes('rc')) {
          await featureInput.selectByVisibleText('Rookie');
        }
        if (product.metadata.printRun > 0) {
          await featureInput.selectByVisibleText('Serial Numbered');
          if (product.metadata.printRun === 1) {
            await featureInput.selectByVisibleText('1/1');
          }
        }
        if (product.metadata.autographed) {
          await featureInput.selectByVisibleText('Autograph');
        }
        if (features.includes('jersey') || features.includes('patch')) {
          await featureInput.selectByVisibleText('Patch');
          await featureInput.selectByVisibleText('Memorabilia');
        }
        if (features.includes('mem')) {
          await featureInput.selectByVisibleText('Memorabilia');
        }
        if (features.includes('sp') || features.includes('sport print') || features.includes('variation')) {
          await featureInput.selectByVisibleText('Short Print');
        }
        if (category.metadata.insert) {
          await featureInput.selectByVisibleText('Insert');
        }
        if (category.metadata.parallel) {
          await featureInput.selectByVisibleText('Parallel');
          if ((category.metadata.parallel as string).indexOf('refractor')) {
            await featureInput.selectByVisibleText('Refractor');
          }
        }
        if (features.includes('case')) {
          await featureInput.selectByVisibleText('Case Hit');
        }
        if (category.metadata.year < 1980) {
          await featureInput.selectByVisibleText('Vintage');
        }
        if (features.includes('jersey number')) {
          await featureInput.selectByVisibleText('Jersey Numbered');
        }

        await form.$('textarea[name="details"').setValue(`${product.description}\n\n[${productVariant.sku}]`);

        logProgress('Submitting Card to MCP...');
        await form.$('button.yellow-btn').click();

        const toast = await mcp.$('.toast-message');
        await toast.waitForExist({ timeout: 30000 });
        fs.rmSync(frontImage);
        fs.rmSync(backImage);
        const resultText = await toast.getText();
        let message: string;
        if (resultText.indexOf('Successful') > -1) {
          message = `mcp::${productVariant.sku} listed on MCP`;
        } else {
          message = `mcp::${productVariant.sku} failed to list on MCP::${resultText}`;
          //TODO Need to log in a way that is actionable
        }
        logProgress('Finsihing up...');
        await toast.waitForExist({ reverse: true, timeout: 10000 });
        logger.success(activityId, message);
      } else {
        logger.success(activityId, `mcp::${productVariant.sku} already listed on MCP`);
      }
    }
  } catch (error) {
    logger?.error('mcpHandler::error: ', error);
    throw error;
  } finally {
    if (mcp) {
      await mcp.shutdown();
    }
  }
}

export const login = async () => {
  const browser = await remote({
    capabilities: {
      browserName: 'chrome',
      'goog:chromeOptions': {
        args: ['--no-sandbox', '--disable-dev-shm-usage'],
      },
    },
    baseUrl: 'https://mycardpost.com/',
    logLevel: 'error',
  });

  await browser.url('login');

  await browser.$('input[type="email"]').setValue(process.env.MCP_EMAIL);
  await browser.$('input[type="password"]').setValue(process.env.MCP_PASSWORD);
  await browser.$('button=Login').click();
  return browser;
};

async function tempImage(image: string): Promise<string> {
  const file = `/tmp/${image}`;
  if (fs.existsSync(file)) {
    fs.rmSync(file);
  }
  const response = await axios.get(
    `https://firebasestorage.googleapis.com/v0/b/hofdb-2038e.appspot.com/o/${image}?alt=media`,
    {
      responseType: 'stream',
    },
  );
  return new Promise((resolve, reject) => {
    response.data
      .pipe(fs.createWriteStream(file))
      .on('error', reject)
      .once('close', () => resolve(file));
  });
}

export const config: SubscriberConfig = {
  event: 'mcp-listing-update',
  context: {
    subscriberId: 'mcp-handler',
  },
};
