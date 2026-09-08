export function disconnectConfirmation(institution: string, template: string) {
  return template.replace('{institution}', institution)
}
