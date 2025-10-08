"use client";
import React, { useEffect, useRef } from "react";
import { createChart } from "lightweight-charts";

type CandlestickData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type TradingViewChartProps = {
  data: CandlestickData[];
  entryPrice?: number;
  slPrice?: number;
  tp1Price?: number;
  tp2Price?: number;
  tp3Price?: number;
  entryIndex?: number;
  symbol: string;
  timeframe: string;
};

export function TradingViewChart({
  data,
  entryPrice,
  slPrice,
  tp1Price,
  tp2Price,
  tp3Price,
  entryIndex,
  symbol,
  timeframe,
}: TradingViewChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);

  useEffect(() => {
    if (!chartContainerRef.current || data.length === 0) return;

    // Create chart
    const chart = createChart(chartContainerRef.current, {
      width: chartContainerRef.current.clientWidth,
      height: 500,
      layout: {
        background: { color: "#ffffff" },
        textColor: "#333",
      },
      grid: {
        vertLines: { color: "#e1e1e1" },
        horzLines: { color: "#e1e1e1" },
      },
      crosshair: {
        mode: 0, // Normal crosshair
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: "#cccccc",
      },
      rightPriceScale: {
        borderColor: "#cccccc",
      },
    });

    chartRef.current = chart;

    // Add candlestick series
    const candleSeries = chart.addCandlestickSeries({
      upColor: "#26a69a",
      downColor: "#ef5350",
      borderUpColor: "#26a69a",
      borderDownColor: "#ef5350",
      wickUpColor: "#26a69a",
      wickDownColor: "#ef5350",
    });

    candleSeriesRef.current = candleSeries;

    // Format data for TradingView
    const formattedData = data.map((d) => ({
      time: Math.floor(d.time / 1000) as any, // Convert ms to seconds
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeries.setData(formattedData as any);

    // Add price lines for levels
    if (entryPrice) {
      candleSeries.createPriceLine({
        price: entryPrice,
        color: "#6b7280",
        lineWidth: 2,
        lineStyle: 2, // Dashed
        axisLabelVisible: true,
        title: "Entry",
      });
    }

    if (slPrice) {
      candleSeries.createPriceLine({
        price: slPrice,
        color: "#ef4444",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "SL",
      });
    }

    if (tp1Price) {
      candleSeries.createPriceLine({
        price: tp1Price,
        color: "#16a34a",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP1",
      });
    }

    if (tp2Price) {
      candleSeries.createPriceLine({
        price: tp2Price,
        color: "#16a34a",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP2",
      });
    }

    if (tp3Price) {
      candleSeries.createPriceLine({
        price: tp3Price,
        color: "#16a34a",
        lineWidth: 2,
        lineStyle: 2,
        axisLabelVisible: true,
        title: "TP3",
      });
    }

    // Add marker for entry candle
    if (entryIndex !== undefined && entryIndex >= 0 && formattedData[entryIndex]) {
      candleSeries.setMarkers([
        {
          time: formattedData[entryIndex].time,
          position: "belowBar",
          color: "#f59e0b",
          shape: "arrowUp",
          text: "ENTRY",
        },
      ]);
    }

    // Fit content
    chart.timeScale().fitContent();

    // Handle resize
    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
    };
  }, [data, entryPrice, slPrice, tp1Price, tp2Price, tp3Price, entryIndex]);

  return (
    <div className="w-full">
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-semibold">
          {symbol} • {timeframe}
        </span>
        <span className="text-muted-foreground">{data.length} nến</span>
      </div>
      <div
        ref={chartContainerRef}
        className="rounded-lg border bg-white"
        style={{ height: "500px" }}
      />
      <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-gray-500" style={{ borderTop: "2px dashed" }} />
          <span>Entry</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-red-500" style={{ borderTop: "2px dashed" }} />
          <span>SL</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-0.5 bg-green-500" style={{ borderTop: "2px dashed" }} />
          <span>TP1-3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Entry candle marker</span>
        </div>
      </div>
    </div>
  );
}
