const { ethers } = require('ethers')


function streamNewBlocks(wssUrl, eventEmitter) {
  const wss = new ethers.WebSocketProvider(wssUrl)

  wss.on('block', async (blockNumber) => {
    let block = await wss.getBlock(blockNumber)
    eventEmitter.emit('event', {
      type: 'block',
      blockNumber: block.number,
      timestamp: block.timestamp,
      baseFee: BigInt(block.baseFeePerGas),
    })
  })

  return wss
}

module.exports = {
  streamNewBlocks,
}
