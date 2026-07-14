'use client'

import dynamic from 'next/dynamic'
import 'chart.js/auto' // ✅ Auto-register semua skala Chart.js

// ✅ Lazy loading Chart.js components
const Bar = dynamic(() => import('react-chartjs-2').then(mod => mod.Bar), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-700 rounded"></div>,
})

const Doughnut = dynamic(() => import('react-chartjs-2').then(mod => mod.Doughnut), {
  ssr: false,
  loading: () => <div className="h-64 animate-pulse bg-gray-200 dark:bg-gray-700 rounded"></div>,
})

interface AdminChartsProps {
  monthlyData: any
  statusData: any
}

export default function AdminCharts({ monthlyData, statusData }: AdminChartsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Pendapatan Dikonfirmasi per Bulan
        </h2>
        {monthlyData && <Bar data={monthlyData} options={{ responsive: true }} />}
      </div>
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow dark:shadow-gray-800/50">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Status Pesanan
        </h2>
        {statusData && <Doughnut data={statusData} options={{ responsive: true }} />}
      </div>
    </div>
  )
}