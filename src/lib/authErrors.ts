// Tradução de mensagens de erro do Supabase Auth para português
const map: Array<{ test: RegExp; pt: string }> = [
  { test: /invalid login credentials/i, pt: "E-mail ou senha incorretos." },
  { test: /invalid email or password/i, pt: "E-mail ou senha incorretos." },
  { test: /email not confirmed/i, pt: "E-mail ainda não confirmado. Verifique sua caixa de entrada." },
  { test: /user not found/i, pt: "Usuário não encontrado." },
  { test: /user already registered|already registered|already exists/i, pt: "Este e-mail já está cadastrado." },
  { test: /password should be at least (\d+)/i, pt: "A senha deve ter pelo menos $1 caracteres." },
  { test: /password is too short/i, pt: "A senha é muito curta." },
  { test: /password.*(weak|pwned|compromised|breach|leaked|hibp)/i, pt: "Senha muito fraca ou já vazada na internet. Escolha uma senha mais forte." },
  { test: /weak.?password/i, pt: "Senha muito fraca. Use letras, números e símbolos." },
  { test: /same.?password|new password should be different/i, pt: "A nova senha deve ser diferente da anterior." },
  { test: /unable to validate email|invalid.*email/i, pt: "E-mail inválido." },
  { test: /signup.?(is )?disabled/i, pt: "Cadastro desativado no momento." },
  { test: /email rate limit exceeded|over_email_send_rate_limit/i, pt: "Muitos e-mails enviados. Tente novamente em alguns minutos." },
  { test: /rate limit|too many requests/i, pt: "Muitas tentativas. Aguarde um momento e tente novamente." },
  { test: /token.*(expired|invalid)|otp.*(expired|invalid)|jwt expired/i, pt: "Link ou código expirado. Solicite um novo." },
  { test: /session.*(expired|missing|not found)/i, pt: "Sua sessão expirou. Faça login novamente." },
  { test: /captcha/i, pt: "Falha na verificação de segurança. Tente novamente." },
  { test: /network|failed to fetch|fetch failed/i, pt: "Falha de conexão. Verifique sua internet e tente novamente." },
  { test: /not authorized|unauthorized|permission/i, pt: "Você não tem permissão para realizar esta ação." },
  { test: /database error|internal server error|unexpected/i, pt: "Erro interno do sistema. Tente novamente em instantes." },
];

export function translateAuthError(err: unknown, fallback = "Ocorreu um erro. Tente novamente."): string {
  if (!err) return fallback;
  const msg = typeof err === "string"
    ? err
    : (err as any)?.message ?? (err as any)?.error_description ?? "";
  if (!msg) return fallback;
  for (const { test, pt } of map) {
    if (test.test(msg)) return msg.replace(test, pt);
  }
  return fallback;
}