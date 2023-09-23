const { ethers, Contract } = require('ethers')

const UniswapV2PairAbi = require('../abi/UniswapV2Pair.json')
const UniswapV3PairAbi = require('../abi/uniswapV3Pair.json')

const { MULTICALL_ADDRESS, MULTICALL_ABI } = require('./constants')

async function getUniswapV2Reserves(httpsUrl, poolAddresses) {
  const v2PairInterface = new ethers.Interface(UniswapV2PairAbi)

  const calls = poolAddresses.map((address) => ({
    target: address,
    allowFailure: true,
    callData: v2PairInterface.encodeFunctionData('getReserves', []),
  }))

  const provider = new ethers.JsonRpcProvider(httpsUrl)
  const multicall = new ethers.Contract(
    MULTICALL_ADDRESS,
    MULTICALL_ABI,
    provider,
  )
  const result = await multicall.callStatic.aggregate3(calls)

  let reserves = {}
  for (let i = 0; i < result.length; i++) {
    let response = result[i]
    if (response.success) {
      let decoded = v2PairInterface.decodeFunctionResult(
        'getReserves',
        response.returnData,
      )
      reserves[poolAddresses[i]] = [BigInt(decoded[0]), BigInt(decoded[1])]
    }
  }

  return reserves
}

async function batchGetUniswapV2Reserves(httpsUrl, poolAddresses) {
  // Some node provider has request limit for each calling 
  // so therefore we set the request chunk size to 200.
  let poolsCnt = poolAddresses.length
  let batch = Math.ceil(poolsCnt / 200)
  let poolsPerBatch = Math.ceil(poolsCnt / batch)

  let promises = []

  for (let i = 0; i < batch; i++) {
    let startIdx = i * poolsPerBatch
    let endIdx = Math.min(startIdx + poolsPerBatch, poolsCnt)
    promises.push(
      getUniswapV2Reserves(httpsUrl, poolAddresses.slice(startIdx, endIdx)),
    )
  }

  const results = await Promise.all(promises)
  const reserves = Object.assign(...results)
  return reserves
}

async function getUniswapV3Price(httpsUrl, poolAddresses) {
  const v3PairInterface = new ethers.Interface(UniswapV3PairAbi)

  const calls = poolAddresses.map((address) => ({
    //multicall params
    target: address,
    allowFailure: true,
    callData: v3PairInterface.encodeFunctionData('slot0', []),
  }))

  const provider = new ethers.JsonRpcProvider(httpsUrl)
  
  const multicall = new Contract(MULTICALL_ADDRESS, MULTICALL_ABI, provider)
  const result = await multicall.aggregate3.staticCall(calls)

  let prices = {}
  for (let i = 0; i < result.length; i++) {
    let response = result[i]
    if (response.success) {
      let decoded = v3PairInterface.decodeFunctionResult(
        'slot0',
        response.returnData,
      )
      prices[poolAddresses[i]] = parseInt(decoded[0]) ** 2 / 2 ** 192
    }
  }

  return prices
}

async function batchGetUniswapV3Prices(httpsUrl, poolAddresses) {
  // There's a limit to how many requests you can send per call.
  // I've set the request chunk size to 200.
  // This will generally cost you 1~2 seconds per 7~10 batches using a node service.
  let poolsCnt = poolAddresses.length
  let batch = Math.ceil(poolsCnt / 200)
  let poolsPerBatch = Math.ceil(poolsCnt / batch)

  let promises = []

  for (let i = 0; i < batch; i++) {
    let startIdx = i * poolsPerBatch
    let endIdx = Math.min(startIdx + poolsPerBatch, poolsCnt)
    promises.push(
      getUniswapV3Price(httpsUrl, poolAddresses.slice(startIdx, endIdx)),
    )
  }

  const results = await Promise.all(promises)
  const reserves = Object.assign(...results)
  return reserves
}

module.exports = {
  batchGetUniswapV3Prices,
}
