# Ajusta as tabelas do Plano de Acao a largura da pagina e exporta PDF.
param([string]$Arquivo = "$PSScriptRoot\Plano_de_Acao_PI2.docx")
$word = New-Object -ComObject Word.Application
try {
  $doc = $word.Documents.Open((Resolve-Path $Arquivo).Path)
  foreach ($t in $doc.Tables) {
    $t.AllowAutoFit = $true
    $t.PreferredWidthType = 2   # wdPreferredWidthPercent
    $t.PreferredWidth = 100
    $t.Rows.LeftIndent = 0
    $t.AutoFitBehavior(2)       # wdAutoFitWindow
  }
  $doc.Save()
  $doc.ExportAsFixedFormat([System.IO.Path]::ChangeExtension($doc.FullName, '.pdf'), 17)
  "paginas=" + $doc.ComputeStatistics(2)
  $doc.Close()
} finally { $word.Quit() }
