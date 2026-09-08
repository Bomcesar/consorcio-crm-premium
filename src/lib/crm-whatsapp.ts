export const CRM_WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_CRM_WHATSAPP_NUMBER || "";

export const formatPhoneToWa = (phone: string) => {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  return digits.startsWith("55") ? digits : `55${digits}`;
};
