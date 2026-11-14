/* Assinatura do Felyx — única parte que o Leandro define.
   Nada aqui é segredo: só endereços públicos de pagamento.
   - pix_qr: endereço da imagem do QR Code PIX (ou null)
   - pix_copia_cola: código "copia e cola" do PIX (ou null)
   - checkout_url: link público da caixinha de pagamento por cartão do provedor (ou null)
   - precos: valor mensal exibido por plano, em reais (null = "a confirmar")
   Enquanto tudo estiver null, a página reserva a assinatura e NÃO cobra nada. */
window.FELYX_PAGAMENTO = {
  pix_qr: null,
  pix_copia_cola: null,
  checkout_url: null,
  precos: { lite: null, pro: null }
};
