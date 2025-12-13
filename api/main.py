from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import yfinance as yf
from datetime import datetime
from pydantic import BaseModel
from typing import Optional

app = FastAPI(
    title="MyPortfolio Price API",
    description="yfinanceを使用した株価取得API",
    version="1.0.0"
)

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # 本番環境では適切に制限すること
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class PriceResponse(BaseModel):
    ticker: str
    price: float
    currency: str
    timestamp: str
    name: Optional[str] = None


class HealthResponse(BaseModel):
    status: str
    timestamp: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """APIヘルスチェック"""
    return HealthResponse(
        status="ok",
        timestamp=datetime.now().isoformat()
    )


@app.get("/api/price/{ticker}", response_model=PriceResponse)
async def get_price(ticker: str):
    """
    指定されたティッカーシンボルの現在価格を取得
    
    - **ticker**: yfinanceで取得可能なシンボル（例：VT, ^N225, 4689.T）
    """
    try:
        stock = yf.Ticker(ticker)
        info = stock.info
        
        # 価格取得（複数のフィールドを試行）
        price = (
            info.get("regularMarketPrice") or
            info.get("currentPrice") or
            info.get("previousClose") or
            info.get("navPrice")  # 投資信託用
        )
        
        if price is None:
            # 履歴から最新価格を取得
            hist = stock.history(period="1d")
            if not hist.empty:
                price = float(hist["Close"].iloc[-1])
            else:
                raise HTTPException(
                    status_code=404,
                    detail=f"Price not found for ticker: {ticker}"
                )
        
        currency = info.get("currency", "JPY")
        name = info.get("shortName") or info.get("longName")
        
        return PriceResponse(
            ticker=ticker.upper(),
            price=float(price),
            currency=currency,
            timestamp=datetime.now().isoformat(),
            name=name
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to fetch price for {ticker}: {str(e)}"
        )


@app.get("/api/prices")
async def get_prices(tickers: str):
    """
    複数ティッカーの価格を一括取得
    
    - **tickers**: カンマ区切りのティッカーリスト（例：VT,VTI,^N225）
    """
    ticker_list = [t.strip() for t in tickers.split(",") if t.strip()]
    
    if not ticker_list:
        raise HTTPException(status_code=400, detail="No tickers provided")
    
    if len(ticker_list) > 20:
        raise HTTPException(status_code=400, detail="Maximum 20 tickers allowed")
    
    results = []
    errors = []
    
    for ticker in ticker_list:
        try:
            stock = yf.Ticker(ticker)
            info = stock.info
            
            price = (
                info.get("regularMarketPrice") or
                info.get("currentPrice") or
                info.get("previousClose")
            )
            
            if price is None:
                hist = stock.history(period="1d")
                if not hist.empty:
                    price = float(hist["Close"].iloc[-1])
            
            if price is not None:
                results.append({
                    "ticker": ticker.upper(),
                    "price": float(price),
                    "currency": info.get("currency", "JPY"),
                    "timestamp": datetime.now().isoformat(),
                    "name": info.get("shortName")
                })
            else:
                errors.append({"ticker": ticker, "error": "Price not found"})
                
        except Exception as e:
            errors.append({"ticker": ticker, "error": str(e)})
    
    return {
        "results": results,
        "errors": errors,
        "timestamp": datetime.now().isoformat()
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
