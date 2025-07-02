import asyncio
import json
import threading
from fastapi import FastAPI, WebSocket
from fastapi.middleware.cors import CORSMiddleware
from dhanhq import DhanContext, MarketFeed
from dotenv import load_dotenv
import os

load_dotenv()


client_id = os.getenv("CLIENT_ID")
access_token = os.getenv("ACCESS_TOKEN")

app = FastAPI()

# CORS config
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

clients = []
latest_data = None
feed = None

dhan_context = DhanContext(client_id, access_token)
instruments = [(MarketFeed.NSE_FNO, "53429", MarketFeed.Full)] # replace the security ID as you need

# This thread handles async feed.connect() and polling
def start_dhan_feed():
    global feed, latest_data
    loop = asyncio.new_event_loop()
    asyncio.set_event_loop(loop)
    feed = MarketFeed(dhan_context, instruments, version="v2")

    try:
        loop.run_until_complete(feed.connect())
        print("✅ Feed connected in background thread.")

        while True:
            data = feed.get_data()
            if data:
                latest_data = json.dumps(data)
            loop.run_until_complete(asyncio.sleep(0.2))

    except Exception as e:
        print("❌ Feed thread error:", e)

# This sends latest data to all websocket clients
async def push_data():
    while True:
        if latest_data:
            for ws in clients:
                try:
                    await ws.send_text(latest_data)
                except Exception as e:
                    print("❌ WebSocket send error:", e)
        await asyncio.sleep(2)

@app.on_event("startup")
async def on_startup():
    threading.Thread(target=start_dhan_feed, daemon=True).start()
    asyncio.create_task(push_data())

@app.websocket("/ws/feed")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    print("✅ Web client connected")
    try:
        while True:
            await asyncio.sleep(2)
    except:
        print("❌ Client disconnected")
    finally:
        clients.remove(websocket)
        await websocket.close()

# dummy data for testing

# from fastapi import FastAPI, WebSocket
# from fastapi.middleware.cors import CORSMiddleware
# import json
# import asyncio
# import random
# from datetime import datetime

# app = FastAPI()

# # Allow frontend to connect
# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["*"],  # Change this if using a specific frontend domain
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# @app.websocket("/ws/feed")
# async def websocket_endpoint(websocket: WebSocket):
#     await websocket.accept()
#     try:
#         while True:
#             dummy = {
#                 "type": "Full Data",
#                 "exchange_segment": 1,
#                 "security_id": 20293,
#                 "LTP": round(random.uniform(700, 710), 2),
#                 "LTQ": random.randint(1, 100),
#                 "LTT": datetime.now().strftime("%H:%M:%S"),
#                 "avg_price": round(random.uniform(698, 703), 2),
#                 "volume": random.randint(1000000, 1200000),
#                 "total_sell_quantity": random.randint(200000, 400000),
#                 "total_buy_quantity": random.randint(200000, 400000),
#                 "OI": 0,
#                 "oi_day_high": 0,
#                 "oi_day_low": 0,
#                 "open": round(random.uniform(700, 705), 2),
#                 "close": round(random.uniform(695, 700), 2),
#                 "high": round(random.uniform(705, 710), 2),
#                 "low": round(random.uniform(695, 700), 2),
#                 "depth": [
#                     {
#                         "bid_quantity": random.randint(50, 1000),
#                         "ask_quantity": random.randint(100, 2000),
#                         "bid_orders": random.randint(1, 10),
#                         "ask_orders": random.randint(1, 15),
#                         "bid_price": str(round(random.uniform(700.00, 700.50), 2)),
#                         "ask_price": str(round(random.uniform(700.60, 701.00), 2))
#                     }
#                     for _ in range(5)
#                 ]
#             }
#             await websocket.send_text(json.dumps(dummy))
#             await asyncio.sleep(2)  # Send every 1 second
#     except Exception as e:
#         print(f"❌ WebSocket error: {e}")
