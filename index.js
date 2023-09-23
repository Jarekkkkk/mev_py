const ethers = require('ethers')
const EventEmitter = require('events')

const { loadAllPoolsFromV3, filter_pools_by_token } = require('./src/pools')
const { HTTPS_URL, WSS_URL } = require('./src/constants')
const { logger } = require('./src/logger')
const { streamNewBlocks } = require('./src/stream')
const { batchGetUniswapV3Prices } = require('./src/dex')

const token_address = require('./src/json/token.json')
const { getKeyByValue } = require('./src/utils')

const filtered_pair = [
  token_address.weth,
  token_address.arb,
  token_address.tusd,
  token_address.usdc,
  token_address.wbtc,
  token_address.usdt,
]

// contract factory_address
const uni_v3_factory_address = '0x1F98431c8aD98523631AE4a59f267346ea31F984'

async function main() {
  const provider = new ethers.JsonRpcProvider(HTTPS_URL)
  const factoryBlocks = [7727528]

  let pools = await loadAllPoolsFromV3(
    HTTPS_URL,
    uni_v3_factory_address,
    factoryBlocks,
    50000,
  )
  pools = filter_pools_by_token(pools, filtered_pair)

  logger.info(`Initial pool count: ${Object.keys(pools).length}`)

  let s = new Date()
  let prices = await batchGetUniswapV3Prices(HTTPS_URL, Object.keys(pools))
  let e = new Date()
  logger.info(`Batch reserves call took: ${(e - s) / 1000} seconds`)

  // price/ name
  Object.keys(pools).forEach((key) => {
    pools[key].price =
      prices[key] * 10 ** (pools[key].decimals0 - pools[key].decimals1)
    pools[key].name =
      getKeyByValue(token_address, pools[key].token0) +
      '/' +
      getKeyByValue(token_address, pools[key].token1)
  })

  let eventEmitter = new EventEmitter()

  streamNewBlocks(WSS_URL, eventEmitter)
  streamNewBlocks(WSS_URL, eventEmitter)

  eventEmitter.on('event', async (event) => {
    let blockNumber = event.blockNumber
    logger.info(`🧱New Block #${blockNumber} 🕛New Block Timestamp ${event.timestamp}`)
  })
}

;(async () => {
  await main()
})()
