import {CheckCircle2,Info,LoaderCircle,X,XCircle} from 'lucide-react'
import {useEffect,useState} from 'react'
import { useNavigate } from 'react-router-dom'
import {toastEventName,type Toast} from './feedback-events'

export function ToastViewport(){
  const [toasts,setToasts]=useState<Toast[]>([])
  const navigate = useNavigate()

  useEffect(()=>{
    const listener=(event:Event)=>{
      const toast=(event as CustomEvent<Toast>).detail
      setToasts(items=>[...items.slice(-3),toast])
      window.setTimeout(()=>setToasts(items=>items.filter(item=>item.id!==toast.id)),6000)
    }
    window.addEventListener(toastEventName,listener)
    return()=>window.removeEventListener(toastEventName,listener)
  },[])

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map(toast=>{
        const isClickable = Boolean(toast.onClick || toast.redirectTo);
        return (
          <div
            className={`toast ${toast.kind}`}
            style={{ cursor: isClickable ? 'pointer' : 'default' }}
            role={toast.kind==='error'?'alert':'status'}
            key={toast.id}
            onClick={(e) => {
              const target = e.target as HTMLElement;
              // Avoid navigating if they click the close button or an action button
              if (target.closest('button')) return;

              if (toast.redirectTo) {
                navigate(toast.redirectTo);
              }
              if (toast.onClick) {
                toast.onClick();
              }
              // Dismiss toast on click
              setToasts(items=>items.filter(item=>item.id!==toast.id));
            }}
          >
            {toast.kind==='success'?<CheckCircle2/>:toast.kind==='error'?<XCircle/>:<Info/>}
            <div style={{ flexGrow: 1 }}>
              <strong style={{ display: 'block', fontSize: '14px' }}>{toast.title}</strong>
              {toast.description&&<p>{toast.description}</p>}
            </div>
            {toast.actionLabel && toast.onAction && (
              <button
                onClick={() => {
                  toast.onAction?.();
                  setToasts(items=>items.filter(item=>item.id!==toast.id));
                }}
                style={{
                  background: 'var(--primary)',
                  color: 'var(--primary-foreground)',
                  border: 'none',
                  padding: '6px 10px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  marginRight: '8px'
                }}
              >
                {toast.actionLabel}
              </button>
            )}
            <button aria-label="Fechar aviso" onClick={()=>setToasts(items=>items.filter(item=>item.id!==toast.id))}><X/></button>
          </div>
        );
      })}
    </div>
  )
}


export function LoadingOverlay({open,title,description}:{open:boolean;title:string;description?:string}){
  if(!open)return null
  return <div className="loading-overlay" role="status" aria-live="assertive"><div className="loading-dialog"><LoaderCircle className="spinner"/><strong>{title}</strong>{description&&<p>{description}</p>}<span>Não feche esta página.</span></div></div>
}

