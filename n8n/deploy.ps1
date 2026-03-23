param (
    [Parameter(Mandatory=$true)]
    [string]$ApiKey,
    [string]$WorkflowFile = "workflow.json",
    [string]$WorkflowId = ""
)

$baseUrl = "https://n8n.somar.ia.br/api/v1/workflows"
$n8nUrl = if ($WorkflowId) { "$baseUrl/$WorkflowId" } else { $baseUrl }
$method = if ($WorkflowId) { "Put" } else { "Post" }

if (-not (Test-Path $WorkflowFile)) {
    Write-Error "Arquivo $WorkflowFile não encontrado!"
    exit 1
}

$headers = @{
    "X-N8N-API-KEY" = $ApiKey
    "Content-Type"  = "application/json"
}

# === 1. Ler workflow local ===
$localWorkflow = Get-Content $WorkflowFile -Raw | ConvertFrom-Json

# === 2. Preservar credenciais do workflow atual no servidor ===
$credMap = @{}
if ($WorkflowId) {
    Write-Host "Buscando credenciais do workflow atual no servidor..." -ForegroundColor Cyan
    try {
        $currentWorkflow = Invoke-RestMethod -Uri $n8nUrl -Method Get -Headers $headers
        foreach ($node in $currentWorkflow.nodes) {
            if ($node.credentials) {
                $credMap[$node.name] = $node.credentials
                Write-Host "  Credencial preservada: $($node.name)" -ForegroundColor Yellow
            }
        }
    } catch {
        Write-Warning "Não foi possível buscar credenciais atuais. Credenciais do arquivo local serão usadas."
    }
}

# === 3. Montar payload, reaproveitando credenciais do servidor ===
$nodes = $localWorkflow.nodes | ForEach-Object {
    $node = $_
    # Se o servidor tinha credenciais para esse nó, usa as do servidor
    if ($credMap.ContainsKey($node.name)) {
        $node | Add-Member -MemberType NoteProperty -Name "credentials" -Value $credMap[$node.name] -Force
    }
    $node
}

$payload = @{
    name        = $localWorkflow.name
    nodes       = $nodes
    connections = $localWorkflow.connections
}
if ($localWorkflow.settings) { $payload.settings = $localWorkflow.settings }
if ($localWorkflow.tags)     { $payload.tags     = $localWorkflow.tags }

$payloadJson = $payload | ConvertTo-Json -Depth 15

# === 4. Enviar para o servidor ===
Write-Host "Enviando workflow ($method) para $n8nUrl..." -ForegroundColor Cyan

try {
    $response = Invoke-RestMethod -Uri $n8nUrl -Method $method -Headers $headers -Body $payloadJson
    $id = if ($WorkflowId) { $WorkflowId } else { $response.id }
    Write-Host "Deploy realizado com sucesso! ID do Workflow: $id" -ForegroundColor Green

    # === 5. Ativar workflow ===
    Write-Host "Ativando workflow..." -ForegroundColor Cyan
    Invoke-RestMethod -Uri "$baseUrl/$id/activate" -Method Post -Headers $headers -ContentType "application/json" -Body "{}" | Out-Null
    Write-Host "Workflow ativado!" -ForegroundColor Green

} catch {
    Write-Error "Erro no deploy: $_"
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $reader.BaseStream.Position = 0
        $errorResponse = $reader.ReadToEnd()
        Write-Host "Resposta do Servidor: $errorResponse" -ForegroundColor Red
    }
}
