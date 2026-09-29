# Abre o relatorio no Word, atualiza sumario, listas e numeracao, preenche o
# total de folhas e exporta PDF. Uso: powershell -File docs\relatorio\atualizar_campos.ps1
param([string]$Arquivo = "$PSScriptRoot\Relatorio_Parcial_PI2.docx")

$word = New-Object -ComObject Word.Application
$word.Visible = $false
try {
  $doc = $word.Documents.Open((Resolve-Path $Arquivo).Path)
  $doc.Fields.Update() | Out-Null
  foreach ($t in $doc.TablesOfContents) { $t.Update() | Out-Null }
  foreach ($t in $doc.TablesOfFigures) { $t.Update() | Out-Null }

  $folhas = $doc.ComputeStatistics(2)  # wdStatisticPages
  $busca = $doc.Content.Find
  $busca.Execute('{{FOLHAS}}', $false, $false, $false, $false, $false, $true, 1, $false, "$folhas", 2) | Out-Null

  $doc.Fields.Update() | Out-Null
  foreach ($t in $doc.TablesOfContents) { $t.Update() | Out-Null }
  foreach ($t in $doc.TablesOfFigures) { $t.Update() | Out-Null }
  $doc.Save()
  $pdf = [System.IO.Path]::ChangeExtension($doc.FullName, '.pdf')
  $doc.ExportAsFixedFormat($pdf, 17)  # wdExportFormatPDF
  "folhas=$folhas pdf=$pdf"
  $doc.Close()
} finally {
  $word.Quit()
}
