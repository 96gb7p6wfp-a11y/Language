import type { Metadata, Viewport } from "next";
import "./globals.css";
export const metadata:Metadata={title:"Phrase — English & German",description:"Your personal English and German coach. Build real fluency with daily listening, reading, speaking and writing.",applicationName:"Phrase",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg",apple:"/apple-touch-icon.png"},appleWebApp:{capable:true,title:"Phrase",statusBarStyle:"default"}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f8f9fc"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
