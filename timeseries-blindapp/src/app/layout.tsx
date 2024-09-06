import type { Metadata } from "next";
import { Inter, Roboto_Mono } from "next/font/google";
import "./globals.css";
import Head from "next/head";
import Providers from "./providers";
import { ToastContainer } from "react-toastify";
import Header from "@/components/Header/Header";

const roboto = Roboto_Mono({
    weight: ['400', '700'],
    style: ['normal', 'italic'],
    subsets: ['latin'],
    display: 'swap',
})

export const metadata: Metadata = {
    title: "Nillion Passkey Authentication Webapp",
    description: "Nillion Passkey Authentication Webapp",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <Head>
                <link rel="icon" href="https://nillion.com/wp-content/themes/nillion/assets/images/favicon.png" />
            </Head>
            <body className={roboto.className}>
                <Providers>
                    <Header />
                    <ToastContainer
                        position='top-right'
                        autoClose={3000}
                        hideProgressBar={false}
                        newestOnTop={false}
                        closeOnClick
                        rtl={false}
                        draggable
                        pauseOnHover={false}
                        pauseOnFocusLoss={false}
                        theme='light'
                    />
                    {children}
                </Providers>
            </body>
        </html>
    );
}
