import type { TranslationKey } from './en'

export const pt: Record<TranslationKey, string> = {
  'auth.signIn': 'Entrar',
  'auth.signingIn': 'Aguardando login no seu navegador...',
  'auth.timeout': 'Login expirou. Tente novamente.',
  'auth.cancel': 'Cancelar',
  'auth.tryAgain': 'Tentar novamente',
  'auth.tagline': 'Registre guias passo a passo de qualquer aplicativo',

  'idle.startRecording': 'Iniciar Gravacao',
  'idle.hotkey': 'Ctrl+Shift+R',
  'idle.signOut': 'Sair',
  'idle.usage': '{used} de {limit} guias',
  'idle.usageUnlimited': '{used} guias',
  'idle.welcome': 'Bem-vindo, {name}',
  'idle.plan': 'Plano {plan}',

  'recording.countdown.title': 'Gravacao inicia em...',
  'recording.countdown.cancel': 'Pressione Esc para cancelar',
  'recording.stopped': 'Gravacao encerrada',
  'recording.limitReached': 'Limite de {max} passos atingido.',

  'review.title': 'Revise seu guia',
  'review.guideTitle': 'Titulo do guia',
  'review.aiWriter': 'Escritor IA',
  'review.guideType': 'Tipo de guia',
  'review.team': 'Equipe',
  'review.linear': 'Linear',
  'review.interactive': 'Interativo',
  'review.save': 'Salvar guia',
  'review.discard': 'Descartar',
  'review.discardConfirm': 'Descartar esta gravacao? Esta acao nao pode ser desfeita.',
  'review.noSteps': 'Nenhum passo gravado.',
  'review.recordAgain': 'Gravar novamente',
  'review.step': 'Passo {n}',
  'review.deleteStep': 'Excluir passo',

  'upload.uploading': 'Enviando passo {current} de {total}...',
  'upload.failed': 'Falha no envio. Tente novamente.',
  'upload.retry': 'Tentar novamente',

  'success.title': 'Guia criado!',
  'success.description': 'Seu guia com {count} passos foi criado.',
  'success.viewOnline': 'Ver no instruo.ai',
  'success.recordAnother': 'Gravar outro',
  'success.aiPolishing': 'A IA esta polindo seu guia. Os titulos podem ser atualizados em breve.',

  'error.network': 'Erro de rede. Verifique sua conexao.',
  'error.planLimit': 'Voce atingiu o limite de guias do seu plano.',
  'error.upgrade': 'Fazer upgrade',

  'lgpd.title': 'Aviso de Gravacao de Tela',
  'lgpd.message': 'O Instruo captura screenshots de toda a sua tela durante a gravacao. Isso pode incluir dados pessoais visiveis em outros aplicativos. Certifique-se de que nenhuma informacao sensivel esteja exibida antes de iniciar.',
  'lgpd.acknowledge': 'Eu entendo'
}
