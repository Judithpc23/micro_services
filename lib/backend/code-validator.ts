export interface CodeValidationInput {
  language: "python" | "javascript"
  code: string
}

export interface CodeValidationResult {
  valid: boolean
  reasons: string[]
}

export function validateServiceCode(input: CodeValidationInput): CodeValidationResult {
  const { language, code } = input
  const reasons: string[] = []
  const source = code || ""

  if (language === "python") {
    const patterns: Array<{ re: RegExp; reason: string }> = [
      { re: /\bimport\s+os\b/i, reason: "Uso de 'os' no permitido" },
      { re: /\bimport\s+subprocess\b/i, reason: "Uso de 'subprocess' no permitido" },
      { re: /\bos\.system\s*\(/i, reason: "Llamadas a os.system bloqueadas" },
      { re: /\bsubprocess\.(Popen|run|call)\s*\(/i, reason: "Ejecución de procesos bloqueada" },
      { re: /\beval\s*\(/i, reason: "Uso de eval bloqueado" },
      { re: /\bexec\s*\(/i, reason: "Uso de exec bloqueado" },
      { re: /\b__import__\s*\(/i, reason: "Import dinámico bloqueado" },
      { re: /\bopen\s*\(/i, reason: "Acceso a sistema de archivos bloqueado" },
      { re: /\bsocket\b|\bimport\s+socket\b/i, reason: "Acceso de bajo nivel a red bloqueado" },
    ]
    patterns.forEach(({ re, reason }) => {
      if (re.test(source)) reasons.push(reason)
    })
  } else {
    const patterns: Array<{ re: RegExp; reason: string }> = [
      { re: /\brequire\(['"]child_process['"]\)/i, reason: "Uso de child_process bloqueado" },
      { re: /\b(child_process\.|exec\(|spawn\()/i, reason: "Ejecución de procesos bloqueada" },
      { re: /\brequire\(['"]fs['"]\)/i, reason: "Acceso a sistema de archivos bloqueado" },
      { re: /\bfs\./i, reason: "Acceso a sistema de archivos bloqueado" },
      { re: /\beval\s*\(/i, reason: "Uso de eval bloqueado" },
      { re: /\bnew\s+Function\s*\(/i, reason: "Ejecución dinámica bloqueada" },
      { re: /\bnet\.|\bdgram\./i, reason: "Sockets de bajo nivel bloqueados" },
    ]
    patterns.forEach(({ re, reason }) => {
      if (re.test(source)) reasons.push(reason)
    })
  }

  return { valid: reasons.length === 0, reasons }
}
