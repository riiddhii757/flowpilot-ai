import {Suspense} from "react";import AuthForm from "./AuthForm";
export default async function AuthPage({searchParams}:{searchParams:Promise<{mode?:string}>}){const params=await searchParams;const initialMode=params.mode==="login"?"login":"signup";return <Suspense fallback={<div className="min-h-screen bg-[#070812]"/>}><AuthForm initialMode={initialMode}/></Suspense>}
