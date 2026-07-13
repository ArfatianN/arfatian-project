import Image from 'next/image'
import Link from 'next/link'

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-lg shadow-md p-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-6 text-center">Tentang Lilur IT</h1>
          
          <div className="flex justify-center mb-8">
            <Image
              src="/lilur-icon.png"
              alt="Lilur IT"
              width={120}
              height={120}
              className="rounded-full"
            />
          </div>

          <div className="prose max-w-none text-gray-700 space-y-4">
            <p>
              <strong>Lilur IT</strong> adalah platform penyedia jasa teknologi informasi yang
              berkomitmen memberikan solusi digital terbaik untuk bisnis dan individu.
            </p>
            <p>
              Kami hadir untuk membantu Anda dalam berbagai kebutuhan IT, mulai dari
              pengembangan website, aplikasi mobile, desain grafis, hingga konsultasi teknologi.
            </p>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">Visi</h2>
            <p>
              Menjadi mitra teknologi terpercaya yang mendorong transformasi digital di Indonesia.
            </p>
            <h2 className="text-xl font-semibold text-gray-900 mt-6">Misi</h2>
            <ul className="list-disc pl-6 space-y-2">
              <li>Menyediakan layanan IT berkualitas dengan harga terjangkau</li>
              <li>Membangun solusi digital yang inovatif dan tepat guna</li>
              <li>Memberikan pengalaman terbaik bagi setiap pelanggan</li>
            </ul>
            <p className="mt-6">
              <Link href="/contact" className="text-blue-600 hover:underline">
                Hubungi kami
              </Link>{' '}
              untuk konsultasi gratis!
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}