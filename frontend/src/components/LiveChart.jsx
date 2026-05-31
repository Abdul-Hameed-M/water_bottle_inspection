import React from 'react';
import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from 'recharts';

const LiveChart = ({ data }) => {
  return (
    <div className="w-full h-[320px]">
      {data && data.length > 0 ? (
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={data}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="colorPass" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22C55E" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#22C55E" stopOpacity={0.0}/>
              </linearGradient>
              <linearGradient id="colorFail" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2}/>
                <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F3F4F6" />
            <XAxis 
              dataKey="time" 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }} 
            />
            <YAxis 
              tickLine={false} 
              axisLine={false} 
              tick={{ fill: '#9CA3AF', fontSize: 11 }} 
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#FFFFFF', 
                borderRadius: '8px', 
                border: '1px solid #E5E7EB',
                fontFamily: 'Poppins, sans-serif',
                fontSize: '12px'
              }}
            />
            <Legend verticalAlign="top" height={36} iconType="circle" iconSize={8} />
            <Area 
              type="monotone" 
              dataKey="passed" 
              name="Passed Bottles" 
              stroke="#22C55E" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorPass)" 
            />
            <Area 
              type="monotone" 
              dataKey="failed" 
              name="Defective Bottles" 
              stroke="#EF4444" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorFail)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">
          Inspection active... waiting for stream data
        </div>
      )}
    </div>
  );
};

export default LiveChart;
