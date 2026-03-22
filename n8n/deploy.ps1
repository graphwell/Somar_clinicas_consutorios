# Script de deploy para n8n - Somar.IA
# Uso: .\deploy.ps1 -ApiKey "SUA_API_KEY"

param (
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    [string]$WorkflowFile = "workflow.json"
)

$n8nUrl = "https://n8n.somar.ia.br/api/v1/workflows"

if (-not (Test-Path $workflowFile)) {
    Write-Error "Arquivo $workflowFile não encontrado!"
    exit 1
}

$workflowJson = Get-Content $workflowFile -Raw | ConvertFrom-Json
$payload = @{
    name = $workflowJson.name
    nodes = $workflowJson.nodes
    connections = $workflowJson.connections
}
if ($workflowJson.settings) { $payload.settings = $workflowJson.settings }
if ($workflowJson.active) { $payload.active = $workflowJson.active }
if ($workflowJson.tags) { $payload.tags = $workflowJson.tags }

$payloadJson = $payload | ConvertTo-Json -Depth 10

$headers = @{
    "X-N8N-API-KEY" = $ApiKey
    "Content-Type" = "application/json"
}

Write-Host "Enviando workflow para $n8nUrl..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $n8nUrl -Method Post -Headers $headers -Body $payloadJson
    Write-Host "Deploy realizado com sucesso! ID do Workflow: $($response.id)" -ForegroundColor Green
    Write-Host "URL do Webhook: https://n8n.somar.ia.br/webhook/entrada-leads" -ForegroundColor Yellow
} catch {
    Write-Error "Erro no deploy: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $errorResponse = $reader.ReadToEnd()
        Write-Host "Resposta do Servidor: $errorResponse" -ForegroundColor Red
    }
}
