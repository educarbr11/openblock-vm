# Hand Pose Detection

Extensão built-in para detectar mãos e gestos simples usando a câmera no navegador.

## Blocos

- `abrir detector de mãos`: abre a janela compacta com câmera, esqueleto da mão e resultado.
- `mão detectada?`: retorna `true` quando pelo menos uma mão foi detectada.
- `quantidade de mãos`: retorna `0`, `1` ou `2`.
- `gesto reconhecido`: retorna `mão aberta`, `mão fechada`, `apontando`, `pinça` ou vazio.
- `lado da mão [HAND]`: retorna `left` ou `right`.
- `posição [AXIS] do ponto [POINT] da mão [HAND]`: retorna coordenadas `x`, `y` ou `z` de um dos 21 pontos MediaPipe.
- `confiança da mão [HAND]`: retorna a confiança de `0` a `100`.
- `quando detectar gesto [GESTURE] com confiança > [CONFIDENCE]`: dispara quando o gesto atual passa do limite.

## Dependências

O GUI carrega sob demanda por CDN:

- `@tensorflow/tfjs@4.22.0`
- `@tensorflow-models/hand-pose-detection@2.0.0`
- `@mediapipe/hands`

## Gestos suportados

Os gestos v1 são heurísticos sobre os keypoints:

- `mão aberta`
- `mão fechada`
- `apontando`
- `pinça`
- `nenhum`

## Privacidade e limitações

O processamento roda localmente no navegador. A extensão usa a câmera, mas não salva nem envia imagens para servidor. A detecção depende de iluminação, enquadramento, câmera disponível e acesso à internet para baixar os modelos.
