import { TYPE, useToast } from 'vue-toastification';

export default function useToaster() {
  const toast = useToast();

  return (message: string, msgType: TYPE, sticky = false) => {
    const timeout = sticky === true ? false : 3000;
    toast(message, {
      timeout: timeout,
      type: msgType,
    });
  };
}
