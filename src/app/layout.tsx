import type { Metadata } from 'next';
import { Toaster } from 'sonner';
import { AuthProvider } from '@/context/AuthContext';
import QueryProvider from '@/providers/QueryProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'CotizadorPro',
  description: 'Sistema de cotizaciones profesional',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased" suppressHydrationWarning>
      <head>
        <script src="https://code.iconify.design/iconify-icon/1.0.7/iconify-icon.min.js"></script>
      </head>
      <body className="min-h-full">
        <QueryProvider>
          <AuthProvider>
            <Toaster position="top-center" theme="dark" duration={5000} richColors />
            {children}
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
