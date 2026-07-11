export type ToastKind='success'|'error'|'info'
export type Toast={id:string;kind:ToastKind;title:string;description?:string}
export const toastEventName='kooki:toast'
export function notify(kind:ToastKind,title:string,description?:string){
  window.dispatchEvent(new CustomEvent<Toast>(toastEventName,{detail:{id:crypto.randomUUID(),kind,title,description}}))
}
