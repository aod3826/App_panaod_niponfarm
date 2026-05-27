import React, { useEffect, useState, useRef } from 'react';
import { Cloud, CloudRain, Droplets, Sun, MapPin, Loader2, Wind, Eye, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { th } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';

interface WeatherData {
  temp: number;
  humidity: number;
  description: string;
  icon: string;
  main: string;
  windSpeed: number;
  visibility: number;
}

export default function HeaderWeatherWidget() {
  const [weather, setWeather] = useState<WeatherData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPopup, setShowPopup] = useState(false);

  // Lat & Lon provided by user for the farm
  const lat = 7.6224;
  const lon = 99.9995;

  useEffect(() => {
    const fetchWeather = async () => {
      try {
        const res = await fetch(`/api/weather?latitude=${lat}&longitude=${lon}`);
        if (!res.ok) {
          throw new Error('Failed to fetch weather');
        }
        const data = await res.json();
        
        const weatherObj = data.weather && data.weather[0] ? data.weather[0] : { description: 'เมฆครึ้ม', main: 'Clouds' };

        setWeather({
          temp: Math.round(data.main?.temp || 0),
          humidity: data.main?.humidity || 0,
          description: weatherObj.description,
          icon: weatherObj.icon || '',
          main: weatherObj.main || '',
          windSpeed: data.wind?.speed || 0,
          visibility: data.visibility || 10000
        });
      } catch (err: any) {
        // Intentionally silence the error to a warning to prevent UI error flooding
        console.warn("Weather fetch fallback:", err.message);
        setError("โหลดข้อมูลสภาพอากาศไม่สำเร็จ");
      } finally {
        setLoading(false);
      }
    };

    fetchWeather();
    // Refresh every 10 minutes
    const interval = setInterval(fetchWeather, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, [lat, lon]);

  const shortDateStr = format(new Date(), 'E. d MMM', { locale: th });

  const getWeatherIcon = (className = "w-4 h-4") => {
    if (!weather) return <Cloud className={className} />;
    const mainCondition = weather.main.toLowerCase();
    if (mainCondition.includes('rain') || mainCondition.includes('drizzle') || mainCondition.includes('thunderstorm')) {
      return <CloudRain className={className + " text-blue-500 drop-shadow-sm fill-blue-100"} />;
    }
    if (mainCondition.includes('clear')) {
      return <Sun className={className + " text-amber-500 drop-shadow-sm fill-amber-400"} />;
    }
    return <Cloud className={className + " text-sky-400 drop-shadow-sm fill-sky-100"} />;
  };

  return (
    <>
      {/* Overlay to close when clicking outside the full-width panel */}
      {showPopup && (
        <div 
          className="fixed inset-0 z-[50]" 
          onClick={() => setShowPopup(false)}
        />
      )}

      <div className="relative">
        <motion.button 
          onPanEnd={(e, info) => {
            // Swipe down to open
            if (info.offset.y > 20) {
              setShowPopup(true);
            }
          }}
          onClick={() => setShowPopup(!showPopup)}
          className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 dark:text-white/80 hover:bg-slate-100 dark:hover:bg-white/10 px-2 py-1 -ml-2 rounded-lg transition-colors active:scale-95 touch-none"
        >
          {loading ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : error ? (
            <span className="text-red-500">Error</span>
          ) : weather ? (
            <>
              {getWeatherIcon("w-4 h-4")}
              <span className="font-medium whitespace-nowrap">{format(new Date(), 'E.d MMM', { locale: th })} {weather.description} {weather.temp}°C</span>
            </>
          ) : null}
        </motion.button>
      </div>

      <AnimatePresence>
        {showPopup && (
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragEnd={(e, info) => {
              // Swipe up to close
              if (info.offset.y < -30) {
                setShowPopup(false);
              }
            }}
            initial={{ y: "-100%", opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: "-100%", opacity: 0 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className="fixed top-0 left-0 right-0 bg-white/95 dark:bg-[#1a2f3a]/95 backdrop-blur-xl shadow-2xl border-b border-slate-200 dark:border-white/10 z-[60] pt-safe touch-none cursor-pointer"
            onClick={() => setShowPopup(false)}
          >
            <div className="max-w-2xl mx-auto px-6 pt-10 pb-12 relative pointer-events-none">
              <div className="flex justify-between items-start mb-6">
                <div className="flex items-center gap-2 text-slate-600 dark:text-white/70">
                  <MapPin className="w-5 h-5 text-[#00bcd4]" />
                  <span className="text-lg font-bold">บ้านโคกชะงาย</span>
                </div>
                {getWeatherIcon("w-12 h-12")}
              </div>
              
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
                </div>
              ) : error ? (
                <p className="text-center text-red-500 py-8">{error}</p>
              ) : weather ? (
                <>
                  <div className="mb-8 flex flex-col sm:flex-row sm:items-end gap-2 sm:gap-6">
                    <div className="text-6xl sm:text-7xl font-black text-slate-900 dark:text-white tracking-tighter">
                      {weather.temp}°C
                    </div>
                    <div className="text-xl sm:text-2xl font-medium text-slate-600 dark:text-white/70 capitalize pb-2">
                      {weather.description}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 pointer-events-auto">
                    <div className="bg-slate-100/80 dark:bg-white/5 p-4 rounded-3xl flex flex-col items-center justify-center text-center gap-2">
                      <Droplets className="w-6 h-6 text-[#00bcd4]" />
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/50 mb-1">ความชื้น</div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">{weather.humidity}%</div>
                      </div>
                    </div>
                    <div className="bg-slate-100/80 dark:bg-white/5 p-4 rounded-3xl flex flex-col items-center justify-center text-center gap-2">
                      <Wind className="w-6 h-6 text-emerald-400" />
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/50 mb-1">ความเร็วลม</div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">{weather.windSpeed} m/s</div>
                      </div>
                    </div>
                    <div className="bg-slate-100/80 dark:bg-white/5 p-4 rounded-3xl flex flex-col items-center justify-center text-center gap-2">
                      <Eye className="w-6 h-6 text-indigo-400" />
                      <div>
                        <div className="text-xs text-slate-500 dark:text-white/50 mb-1">ทัศนวิสัย</div>
                        <div className="text-lg font-black text-slate-800 dark:text-white">{(weather.visibility / 1000).toFixed(1)} km</div>
                      </div>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            {/* Drag Handle at bottom */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center justify-center text-slate-300 dark:text-white/20">
              <ChevronUp className="w-5 h-5 -mb-2" />
              <div className="w-16 h-1.5 rounded-full bg-slate-300 dark:bg-white/20 mt-2" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
