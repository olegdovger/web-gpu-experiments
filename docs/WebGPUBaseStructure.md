Base WebGPU structure

@startuml
skinparam componentStyle rectangle
skinparam component {
BackgroundColor pink
BorderColor black
FontColor black
}

component GPUDevice
component CommandEncoder
component RenderPassEncoder
component RenderPass
component CanvasContext
component Pipeline
component Shader

GPUDevice --> CommandEncoder : creates
CanvasContext .u.> GPUDevice: uses
CommandEncoder --> RenderPassEncoder : creates
RenderPassEncoder ..> RenderPass : uses
RenderPassEncoder ..> Pipeline : uses
Pipeline ..> Shader : uses
RenderPass ..> CanvasContext : uses

'hide GPUDevice
'hide CanvasContext
'hide CommandEncoder
'hide RenderPassEncoder
'hide Pipeline
'hide Shader
'hide RenderPass

@enduml
