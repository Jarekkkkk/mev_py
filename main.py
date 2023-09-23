import asyncio
import websockets
from msgspec import json
from datetime import datetime
import time
import gc
import csv
gc.enable()
pairs_to_listen = ['ARBUSDT','ARBBTC','ARBETH','ARBBUSD','ARBTUSD']

def generate_url(base):
    for pair in pairs_to_listen:
        base += f"{pair.lower()}@bookTicker/"
        base += f"{pair.lower()}@trade/"
    return base[:-1]

def ns():
    return time.time_ns()

async def handler(websocket, callback):
    async for message in websocket:
        await callback(message)

async def callback(message):
    msg = json.decode(message)
    stream = msg['stream']
    data = [val for _, val in msg['data'].items()]
    date = datetime.today().strftime("%Y%m%d")
    data_to_write = [ns()]
    data_to_write.extend(data)
    with open(f'./data/Binance_{stream}_{date}.txt','a+') as f:
        writer = csv.writer(f)
        writer.writerow(data_to_write)

async def start_ws(url):
    async for websocket in websockets.connect(url):
        try:
            await handler(websocket, callback)
        except websockets.ConnectionClosed:
            continue
async def main():
    url = "wss://stream.binance.com:9443/stream?streams="
    url = generate_url(url)
    await asyncio.gather(start_ws(url))

loop = asyncio.get_event_loop()
loop.run_until_complete(main())


