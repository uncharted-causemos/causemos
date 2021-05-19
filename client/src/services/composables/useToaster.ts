import { TYPE, useToast } from 'vue-toastification';

export default function useToaster() {
  const toast = useToast();

  return (message: string, msgType: string, sticky = false) => {
    const t = msgType === 'error' ? TYPE.INFO : TYPE.SUCCESS;
    const timeout = sticky === true ? false : 3000;
    toast(message, {
      timeout: timeout,
      type: t
    });
  };
}
