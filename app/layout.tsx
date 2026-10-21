import type { Metadata, Viewport } from "next";
import "./globals.css";
import "./missions.css";
export const metadata:Metadata={title:"Phrase — English & German",description:"English and German, lived. Debate an opponent, make a deal, solve a case and build real language through interactive AI challenges.",applicationName:"Phrase",manifest:"/manifest.webmanifest",icons:{icon:"/favicon.svg",shortcut:"/favicon.svg",apple:"/apple-touch-icon.png"},appleWebApp:{capable:true,title:"Phrase",statusBarStyle:"default"}};
export const viewport:Viewport={width:"device-width",initialScale:1,viewportFit:"cover",themeColor:"#f8f8f5"};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="en"><body>{children}</body></html>;}
