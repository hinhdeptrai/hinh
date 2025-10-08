"use client";
import React, { useEffect, useRef, useState } from "react";
import { createChart } from "lightweight-charts";
import { Button } from "./ui/button";
import { Play, Pause, SkipBack, SkipForward, FastForward } from "lucide-react";
import { Slider } from "./ui/slider";

type CandlestickData = {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
};

type ReplayChartProps = {
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

export function TradingViewReplay({
  data,
  entryPrice,
  slPrice,
  tp1Price,
  tp2Price,
  tp3Price,
  entryIndex,
  symbol,
  timeframe,
}: ReplayChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<any>(null);
  const candleSeriesRef = useRef<any>(null);
  const intervalRef = useRef<any>(null);

  const [currentIndex, setCurrentIndex] = useState(20); // Start at candle 20
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(1); // 1x, 2x, 5x, 10x
  const [showEntry, setShowEntry] = useState(false);

  const totalCandles = data.length;

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
        mode: 0,
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
      if (intervalRef.current) clearInterval(intervalRef.current);
      chart.remove();
    };
  }, [data]);

  // Update chart when currentIndex changes
  useEffect(() => {
    if (!candleSeriesRef.current) return;

    // Get visible data up to currentIndex
    const visibleData = data.slice(0, currentIndex + 1).map((d) => ({
      time: Math.floor(d.time / 1000) as any,
      open: d.open,
      high: d.high,
      low: d.low,
      close: d.close,
    }));

    candleSeriesRef.current.setData(visibleData as any);

    // Add marker for current candle (at the bottom)
    const markers = [];
    if (visibleData.length > 0) {
      const currentCandle = visibleData[visibleData.length - 1];
      markers.push({
        time: currentCandle.time,
        position: "belowBar" as const,
        color: "#3b82f6",
        shape: "arrowUp" as const,
        text: "▶",
        size: 1,
      });
    }

    // Check if we've reached entry candle
    if (entryIndex !== undefined && currentIndex >= entryIndex) {
      setShowEntry(true);

      // Add entry marker
      const entryCandle = data[entryIndex];
      if (entryCandle) {
        markers.push({
          time: Math.floor(entryCandle.time / 1000) as any,
          position: "belowBar" as const,
          color: "#f59e0b",
          shape: "arrowUp" as const,
          text: "ENTRY",
          size: 1,
        });
      }

      // Add price lines for levels
      if (entryPrice && !candleSeriesRef.current._entryLine) {
        candleSeriesRef.current._entryLine =
          candleSeriesRef.current.createPriceLine({
            price: entryPrice,
            color: "#6b7280",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "Entry",
          });
      }

      if (slPrice && !candleSeriesRef.current._slLine) {
        candleSeriesRef.current._slLine =
          candleSeriesRef.current.createPriceLine({
            price: slPrice,
            color: "#ef4444",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "SL",
          });
      }

      if (tp1Price && !candleSeriesRef.current._tp1Line) {
        candleSeriesRef.current._tp1Line =
          candleSeriesRef.current.createPriceLine({
            price: tp1Price,
            color: "#16a34a",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP1",
          });
      }

      if (tp2Price && !candleSeriesRef.current._tp2Line) {
        candleSeriesRef.current._tp2Line =
          candleSeriesRef.current.createPriceLine({
            price: tp2Price,
            color: "#16a34a",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP2",
          });
      }

      if (tp3Price && !candleSeriesRef.current._tp3Line) {
        candleSeriesRef.current._tp3Line =
          candleSeriesRef.current.createPriceLine({
            price: tp3Price,
            color: "#16a34a",
            lineWidth: 2,
            lineStyle: 2,
            axisLabelVisible: true,
            title: "TP3",
          });
      }
    } else {
      setShowEntry(false);
    }

    // Set all markers (current candle + entry if visible)
    candleSeriesRef.current.setMarkers(markers);

    // Fit content
    if (chartRef.current) {
      chartRef.current.timeScale().fitContent();
    }
  }, [
    currentIndex,
    data,
    entryPrice,
    slPrice,
    tp1Price,
    tp2Price,
    tp3Price,
    entryIndex,
  ]);

  // Play/Pause logic
  useEffect(() => {
    if (isPlaying) {
      const interval = 1000 / speed; // Speed control
      intervalRef.current = setInterval(() => {
        setCurrentIndex((prev) => {
          if (prev >= totalCandles - 1) {
            setIsPlaying(false);
            return prev;
          }
          return prev + 1;
        });
      }, interval);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, speed, totalCandles]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleReset = () => {
    setIsPlaying(false);
    setCurrentIndex(20);
    setShowEntry(false);
  };

  const handleSkipForward = () => {
    setCurrentIndex((prev) => Math.min(prev + 10, totalCandles - 1));
  };

  const handleSkipBack = () => {
    setCurrentIndex((prev) => Math.max(prev - 10, 20));
  };

  const cycleSpeed = () => {
    setSpeed((prev) => {
      if (prev === 1) return 2;
      if (prev === 2) return 5;
      if (prev === 5) return 10;
      return 1;
    });
  };

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <span className="font-semibold">
            {symbol} • {timeframe}
          </span>
          {showEntry && (
            <span className="px-2 py-1 text-xs bg-amber-100 text-amber-800 rounded font-medium">
              🔔 ENTRY VISIBLE
            </span>
          )}
        </div>
        <span className="text-muted-foreground">
          {currentIndex + 1} / {totalCandles} nến
        </span>
      </div>

      <div
        ref={chartContainerRef}
        className="rounded-lg border bg-white"
        style={{ height: "500px" }}
      />

      {/* Controls */}
      <div className="rounded-lg border bg-white p-4 space-y-4">
        {/* Timeline Slider */}
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground w-12">
            #{currentIndex + 1}
          </span>
          <Slider
            value={[currentIndex]}
            min={20}
            max={totalCandles - 1}
            step={1}
            onValueChange={(value) => {
              setIsPlaying(false);
              setCurrentIndex(value[0]);
            }}
            className="flex-1"
          />
          <span className="text-xs text-muted-foreground w-16 text-right">
            {((currentIndex / totalCandles) * 100).toFixed(0)}%
          </span>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleReset}>
              <SkipBack className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={handleSkipBack}>
              <SkipBack className="h-4 w-4" />
              <span className="ml-1">-10</span>
            </Button>

            <Button variant="default" size="sm" onClick={handlePlayPause}>
              {isPlaying ? (
                <>
                  <Pause className="h-4 w-4 mr-1" />
                  Pause
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-1" />
                  Play
                </>
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleSkipForward}>
              <span className="mr-1">+10</span>
              <SkipForward className="h-4 w-4" />
            </Button>

            <Button variant="outline" size="sm" onClick={cycleSpeed}>
              <FastForward className="h-4 w-4 mr-1" />
              {speed}x
            </Button>
          </div>

          <div className="text-xs text-muted-foreground">
            {entryIndex !== undefined && (
              <span>
                Entry tại nến #{entryIndex + 1} •{" "}
                {currentIndex < entryIndex
                  ? `Còn ${entryIndex - currentIndex} nến`
                  : currentIndex === entryIndex
                  ? "ENTRY!"
                  : `Đã qua ${currentIndex - entryIndex} nến`}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-0.5 bg-gray-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span>Entry</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-0.5 bg-red-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span>SL</span>
        </div>
        <div className="flex items-center gap-1">
          <div
            className="w-3 h-0.5 bg-green-500"
            style={{ borderTop: "2px dashed" }}
          />
          <span>TP1-3</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-blue-500" />
          <span>▶ Nến hiện tại</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded-full bg-amber-500" />
          <span>Entry marker</span>
        </div>
      </div>
    </div>
  );
}
