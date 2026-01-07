import React from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    AreaChart,
    Area
} from 'recharts';
import { format } from 'date-fns';

interface ActivityChartProps {
    data: any[];
    type: 'heart_rate' | 'pace' | 'elevation';
    color: string;
}

export const ActivityChart: React.FC<ActivityChartProps> = ({ data, type, color }) => {
    if (!data || data.length === 0) return <div className="h-48 flex items-center justify-center text-gray-400">No data available</div>;

    // Helper to format tooltip values
    const formatValue = (value: number) => {
        if (type === 'heart_rate') return `${Math.round(value)} bpm`;
        if (type === 'elevation') return `${Math.round(value)} m`;
        if (type === 'pace') {
            // Pace is usually in meters/second in streams, need conversion to min/km? 
            // Assuming data passed here is already formatted or raw. 
            // If raw (m/s), 1 m/s = 16.66 min/km? No, speed = dist/time. Pace = time/dist.
            // Let's assume the passed data 'value' is already processed for display or we process here.
            // For now, render raw.
            return value.toFixed(2);
        }
        return value;
    };

    const ChartComponent = type === 'elevation' ? AreaChart : LineChart;
    const DataComponent = type === 'elevation' ? Area : Line;

    return (
        <div className="h-64 w-full">
            <h4 className="text-sm font-medium text-gray-500 mb-2 capitalize">{type.replace('_', ' ')}</h4>
            <ResponsiveContainer width="100%" height="100%">
                <ChartComponent data={data}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis
                        dataKey="index"
                        hide
                    // tickFormatter={(val) => {
                    //     // If we had time/distance sync, we could show it here
                    //     return val;
                    // }}
                    />
                    <YAxis
                        domain={['auto', 'auto']}
                        tick={{ fontSize: 12, fill: '#6B7280' }}
                        width={40}
                        tickFormatter={(val) => Math.round(val).toString()}
                    />
                    <Tooltip
                        contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                        formatter={(value: any) => [formatValue(Number(value) || 0), type]}
                        labelFormatter={() => ''}
                    />
                    <DataComponent
                        type="monotone"
                        dataKey="value"
                        stroke={color}
                        fill={type === 'elevation' ? `${color}33` : undefined}
                        fillOpacity={1}
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                    />
                </ChartComponent>
            </ResponsiveContainer>
        </div>
    );
};
