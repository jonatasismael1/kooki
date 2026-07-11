import {CheckCircle2,Info,LoaderCircle,X,XCircle} from 'lucide-react'
import {useEffect,useState} from 'react'
import {toastEventName,type Toast} from './feedback-events'

export function ToastViewport(){
  const [toasts,setToasts]=useState<Toast[]>([])
  useEffect(()=>{
    const listener=(event:Event)=>{
      const toast=(event as CustomEvent<Toast>).detail
      setToasts(items=>[...items.slice(-3),toast])
      window.setTimeout(()=>setToasts(items=>items.filter(item=>item.id!==toast.id)),5000)
    }
    window.addEventListener(toastEventName,listener)
    return()=>window.removeEventListener(toastEventName,listener)
  },[])
  return <div className="toast-viewport" aria-live="polite" aria-atomic="false">{toasts.map(toast=><div className={`toast ${toast.kind}`} role={toast.kind==='error'?'alert':'status'} key={toast.id}>{toast.kind==='success'?<CheckCircle2/>:toast.kind==='error'?<XCircle/>:<Info/>}<div><strong>{toast.title}</strong>{toast.description&&<p>{toast.description}</p>}</div><button aria-label="Fechar aviso" onClick={()=>setToasts(items=>items.filter(item=>item.id!==toast.id))}><X/></button></div>)}</div>
}

export function LoadingOverlay({open,title,description}:{open:boolean;title:string;description?:string}){
  if(!open)return null
  return <div className="loading-overlay" role="status" aria-live="assertive"><div className="loading-dialog"><LoaderCircle className="spinner"/><strong>{title}</strong>{description&&<p>{description}</p>}<span>Não feche esta página.</span></div></div>
}
