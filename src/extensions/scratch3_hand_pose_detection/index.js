const ArgumentType = require('../../extension-support/argument-type');
const BlockType = require('../../extension-support/block-type');
const Cast = require('../../util/cast');
const formatMessage = require('format-message');

// eslint-disable-next-line max-len
const blockIconURI = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MiA2NSIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHBhdGggZD0iTTM2LjU2NjUgMy43Njc5QzM5LjE2OTYgMi4yNjUwMSA0MS4yOCAzLjQ3NDQ3IDQxLjI4ODUgNi40NTg4TDQxLjM3NTkgNDAuMTQ2OEM0MS4zODQzIDQzLjEzMTEgMzkuMjg3NyA0Ni43Njk2IDM2LjY4NDYgNDguMjcyNEw5Ljg2MTA0IDYzLjc1OUM3LjI2Mzg2IDY1LjI1ODUgNS4xNDc1NiA2NC4wNTI0IDUuMTM5MSA2MS4wNjgxTDUuMDUxNzIgMjcuMzgwMUM1LjA0MzI2IDI0LjM5NTggNy4xNDU4MiAyMC43NTQgOS43NDI5OSAxOS4yNTQ1TDM2LjU2NjUgMy43Njc5WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTcuNzUxIDY0LjgwNjZDNy4yMzI0NSA2NC44MDY2IDYuNzUwMDMgNjQuNjg0IDYuMzIxMzIgNjQuNDM3NEM1LjMwNTY5IDYzLjg1MjUgNC43NDMxOSA2Mi42NTY3IDQuNzM4MzEgNjEuMDY5M0w0LjY1MTM5IDI3LjM4MTNDNC42NDI2IDI0LjI3MDkgNi44MzY5NCAyMC40NzAyIDkuNTQyOTkgMTguOTA4MUwzNi4zNjYyIDMuNDIxODJDMzcuNzU4OCAyLjYxNzYyIDM5LjA4NzkgMi41MDA5MiA0MC4xMDc0IDMuMDg3ODRDNDEuMTIyMSAzLjY3MjMxIDQxLjY4MzYgNC44NjkwOSA0MS42ODg1IDYuNDU3OTZMNDEuNzc2NCA0MC4xNDU5QzQxLjc4NTIgNDMuMjU1MyAzOS41OTA4IDQ3LjA1NjYgMzYuODg0OCA0OC42MTg2TDEwLjA2MTUgNjQuMTA1NEM5LjI1NDkxIDY0LjU3MTIgOC40Njg3OCA2NC44MDY2IDcuNzUxIDY0LjgwNjZaTTM2Ljc2NjYgNC4xMTQyTDkuOTQzMzkgMTkuNjAxQzcuNDU4MDMgMjEuMDM1MSA1LjQ0MzM5IDI0LjUyNDQgNS40NTIxNyAyNy4zNzkzTDUuNTM5MDkgNjEuMDY3M0M1LjU0MjAyIDYyLjM1NjkgNS45NjE5NCA2My4zMDc2IDYuNzIwNzMgNjMuNzQzNkM3LjQ4NDQgNjQuMTg1IDguNTMwMyA2NC4wNjU5IDkuNjYxMTYgNjMuNDEzTDM2LjQ4NDQgNDcuOTI2MkMzOC45Njk4IDQ2LjQ5MTYgNDAuOTg0NCA0My4wMDI0IDQwLjk3NTYgNDAuMTQ3OUw0MC44ODc3IDYuNDU5OTFDNDAuODg0OCA1LjE2ODg5IDQwLjQ2NTggNC4yMTc3MiAzOS43MDggMy43ODEyQzM4Ljk0NjMgMy4zNDI3MiAzNy45MDA0IDMuNDYwNCAzNi43NjY2IDQuMTE0MloiIGZpbGw9IiMwMzBGMzYiLz4KPHBhdGggZD0iTTAuNDAwMjY2IDI0LjY2NjRMMC40ODMwNTUgNTguMzUzNUMwLjQ5MjM4NCA1OS44MzUyIDEuMDE3MSA2MC44NzUyIDEuODYzNjUgNjEuMzcyMkw2LjUwODI0IDY0LjA4M0M1LjY3MTAyIDYzLjU5NTMgNS4xNDYzIDYyLjU0NjEgNS4xMzY5NyA2MS4wNjQ0TDUuMDU0MTggMjcuMzc3M0M1LjA0OTk5IDI1Ljk5NzIgNS41MTA4MSAyNC40ODA4IDYuMjQ5ODUgMjMuMDk1MUwxLjU5ODk2IDIwLjM3NjdDMC44NTc4MjIgMjEuNzYyNiAwLjM5NjA2OCAyMy4yODA3IDAuNDAwMjY2IDI0LjY2NjRaIiBmaWxsPSIjMjAzODg0Ii8+CjxwYXRoIGQ9Ik02LjUwNzg0IDY0LjQ4MjdDNi40Mzk0OCA2NC40ODI3IDYuMzcwMTQgNjQuNDY1MSA2LjMwNjY3IDY0LjQyODVMMS42NjIxNCA2MS43MTc2QzAuNjUzMzQ2IDYxLjEyNDggMC4wOTI3OTkyIDU5LjkzMTQgMC4wODMwMzM1IDU4LjM1NThMMi41NjUwMmUtMDUgMjQuNjY3M0MtMC4wMDM4ODA2NSAyMy4yODc5IDAuNDM4NTAyIDIxLjY5NzEgMS4yNDYxMiAyMC4xODgzQzEuMjk2OSAyMC4wOTIxIDEuMzg1NzcgMjAuMDIxMyAxLjQ5MDI2IDE5Ljk5MkMxLjU5Mzc4IDE5Ljk2MDcgMS43MDYwOCAxOS45NzY0IDEuODAwODEgMjAuMDMxNUw2LjQ1MjE3IDIyLjc0OThDNi42Mzc3MiAyMi44NTgyIDYuNzA0MTMgMjMuMDkzNSA2LjYwMjU2IDIzLjI4MzVDNS44NTg0MiAyNC42NzkgNS40NTAyMiAyNi4xMzI2IDUuNDU0MTMgMjcuMzc2M0w1LjUzNzE0IDYxLjA2MzNDNS41NDQ5NSA2Mi4zNTE0IDUuOTYxOTQgNjMuMzAxNiA2LjcwOTAxIDYzLjczNzFDNi45MDA0MiA2My44NDg0IDYuOTY0ODcgNjQuMDkzNSA2Ljg1MzU0IDY0LjI4NDVDNi43NzkzMiA2NC40MTE5IDYuNjQ1NTMgNjQuNDgyNyA2LjUwNzg0IDY0LjQ4MjdaTTEuNzYxNzQgMjAuOTM1M0MxLjEzNjc0IDIyLjIxNDYgMC43OTY5MDEgMjMuNTI1NyAwLjgwMDgwNyAyNC42NjUzTDAuODgzODE1IDU4LjM1MjNDMC44OTA2NTEgNTkuNjMzMSAxLjMxMDU3IDYwLjU4MzggMi4wNjU0NiA2MS4wMjcxTDQuOTk1MTQgNjIuNzM2NkM0LjgyOTEzIDYyLjI0ODggNC43NDEyNCA2MS42ODc4IDQuNzM2MzUgNjEuMDY2N0w0LjY1MzM1IDI3LjM3ODJDNC42NTA0MiAyNi4xMDg3IDUuMDI3MzcgMjQuNjU1MSA1LjcyMTcxIDIzLjI0OTNMMS43NjE3NCAyMC45MzUzWiIgZmlsbD0iIzAzMEYzNiIvPgo8cGF0aCBkPSJNMzUuMjYyIDAuNzE5NTgyQzM0LjQwNjEgMC4yMjI2MTMgMzMuMjE5MSAwLjI5NjMwNyAzMS45MTIyIDEuMDUwOTdMNS4wOTQwNyAxNi41Mzk5QzMuNjk1OTggMTcuMzQ1IDIuNDU3NjQgMTguNzcxMSAxLjU5ODk3IDIwLjM3NjZMNi4yNDk4NiAyMy4wOTVDNy4xMDc2IDIxLjQ4NjggOC4zNDQ1NCAyMC4wNTY2IDkuNzM4NjYgMTkuMjUwOEwzNi41NjYxIDMuNzcxQzM3Ljg3MyAzLjAxNjM0IDM5LjA2MDMgMi45NDI3NiAzOS45MTU5IDMuNDM5NzNMMzUuMjYyIDAuNzE5NTgyWiIgZmlsbD0iIzA1MkM5OSIvPgo8cGF0aCBkPSJNNi4yNTAwMiAyMy40OTVDNi4xNzk3MSAyMy40OTUgNi4xMTAzNyAyMy40NzY0IDYuMDQ3ODcgMjMuNDQwM0wxLjM5NjUgMjAuNzIyQzEuMjEwOTYgMjAuNjEzNiAxLjE0NDU1IDIwLjM3NzggMS4yNDYxMSAyMC4xODc5QzIuMTkwNDUgMTguNDIzMiAzLjQ4NjM1IDE3LjAwNDMgNC44OTQ1NSAxNi4xOTMyTDMxLjcxMTkgMC43MDQ5NDJDMzMuMTA5NCAtMC4xMDIxODcgMzQuNDM5NSAtMC4yMjEzMjggMzUuNDYyOSAwLjM3Mzg4N0MzNS40NjI5IDAuMzczODg3IDM1LjQ2MjkgMC4zNzM4ODcgMzUuNDYzOSAwLjM3NDM3Nkw0MC4xMTgyIDMuMDk0NTlDNDAuMzA4NiAzLjIwNTkyIDQwLjM3MzEgMy40NTA1NSA0MC4yNjE3IDMuNjQwOThDNDAuMTUwNCAzLjgzMTkgMzkuOTA1MyAzLjg5Njg0IDM5LjcxNDkgMy43ODU1MUMzOC45NTIyIDMuMzQzMTMgMzcuOTA0MyAzLjQ1OTgyIDM2Ljc2NjYgNC4xMTcwNUw5LjkzODUgMTkuNTk3NUM4LjY3OTcxIDIwLjMyNTEgNy40NjM4OSAyMS42NjgzIDYuNjAyNTYgMjMuMjgzMUM2LjU1MTc4IDIzLjM3OTMgNi40NjM4OSAyMy40NTAxIDYuMzU5MzkgMjMuNDc5OEM2LjMyMzI2IDIzLjQ5MDEgNi4yODYxNSAyMy40OTUgNi4yNTAwMiAyMy40OTVaTTIuMTM4NjkgMjAuMjI5NEw2LjA5ODY1IDIyLjU0MzNDNy4wMjA1MyAyMC45NDM3IDguMjMwNDkgMTkuNjYwNSA5LjUzODExIDE4LjkwNDZMMzYuMzY2MiAzLjQyNDE4QzM2LjkyODcgMy4wOTk5NiAzNy40ODA1IDIuODg2NTggMzguMDA1OSAyLjc4Njk3TDM1LjA1OTYgMS4wNjQ4QzM0LjI5NjkgMC42MjE5MzQgMzMuMjUxIDAuNzQwMDk4IDMyLjExMjMgMS4zOTczMkw1LjI5Mzk2IDE2Ljg4NjFDNC4xMjExMSAxNy41NjI0IDIuOTg1MzcgMTguNzY4NCAyLjEzODY5IDIwLjIyOTRaIiBmaWxsPSIjMDMwRjM2Ii8+CjxwYXRoIGQ9Ik04Ljg3MjU0IDI3LjM2OTNDOC44Njc4OCAyNS43NTY5IDEwLjI0NTcgMjMuMzc2MyAxMS42NTMzIDIyLjU2MzNMMzQuMDE5MiA5LjY1MDY0QzM1LjU1NjEgOC43NjMzOCAzNy40Nzc3IDkuODY5MjIgMzcuNDgyNyAxMS42NDM4TDM3LjU1NTQgNDAuMTU3NkMzNy41NiA0MS43NyAzNi4xODIyIDQ0LjE1MDYgMzQuNzc0NiA0NC45NjM1TDEyLjQwODcgNTcuODc1OEMxMC44NzE4IDU4Ljc2MzEgOC45NTAyMyA1Ny42NTcyIDguOTQ1MiA1NS44ODI3TDguODcyNTQgMjcuMzY5M1oiIGZpbGw9IndoaXRlIi8+CjxwYXRoIGQ9Ik0zNy41NTIzIDQwLjE1NTVDMzcuNTYxOSA0MS43Njk5IDM2LjE4NjQgNDQuMTQ4NCAzNC43NzI3IDQ0Ljk2MDNMMTIuNDEwOCA1Ny44NzVDMTAuODczIDU4Ljc2MzMgOC45NTI5OSA1Ny42NTUyIDguOTQzNDMgNTUuODc4NUw4LjkzMzg3IDUwLjQxNDdDMTAuMTQ3IDUwLjU5NjIgMTEuMzg4OSA1MC42OTE3IDEyLjY1OTEgNTAuNjkxN0MyNS4yNjgxIDUwLjY5MTcgMzUuNDk4NSA0MS40OTI5IDM1LjQ5ODUgMzAuMTU0NEMzNS40OTg1IDI0LjQ1MTcgMzIuOTA5OCAxNi40Mjc4IDI4LjczNTYgMTIuNzAyNEwzNC4wMTgxIDkuNjU1MjRDMzUuNTU1OCA4Ljc2Njg5IDM3LjQ3NTggOS44NjU0MiAzNy40ODU0IDExLjY0MjFMMzcuNTUyMyA0MC4xNTU1WiIgZmlsbD0iI0U5RURGNCIvPgo8cGF0aCBkPSJNMTEuMjUzOSA1OC41ODkyQzEwLjc5MDEgNTguNTg5MiAxMC4zMjYyIDU4LjQ2NzcgOS45MDMzNiA1OC4yMjQ1QzkuMDU1NyA1Ny43MzY3IDguNTQ3ODkgNTYuODYxNyA4LjU0NDk2IDU1Ljg4MzdMOC40NzE3MiAyNy4zNzA1QzguNDY3ODEgMjUuNjA5MyA5LjkxNzAzIDIzLjEwNDkgMTEuNDUzMiAyMi4yMTcyTDMzLjgxOTQgOS4zMDQ1N0MzNC42NjUxIDguODE1MzEgMzUuNjc2OCA4LjgxNDMzIDM2LjUyNDUgOS4zMDI2MUMzNy4zNzIxIDkuNzg5OTIgMzcuODc5OSAxMC42NjQ5IDM3Ljg4MjkgMTEuNjQyOUwzNy45NTYxIDQwLjE1NjZDMzcuOTYgNDEuOTE4MyAzNi41MTA4IDQ0LjQyMzIgMzQuOTc0NiA0NS4zMDk5TDEyLjYwODQgNTguMjIyQzEyLjE4NDYgNTguNDY3MiAxMS43MTg4IDU4LjU4OTIgMTEuMjUzOSA1OC41ODkyWk05LjI3MjUgMjcuMzY4NUw5LjM0NTc0IDU1Ljg4MTdDOS4zNDc2OSA1Ni41NzA3IDkuNzA1MTIgNTcuMTg3NCAxMC4zMDE4IDU3LjUzMTFDMTAuODk5NSA1Ny44NzM5IDExLjYxMDQgNTcuODczNCAxMi4yMDggNTcuNTI5N0wzNC41NzQzIDQ0LjYxNzZDMzUuODU2NSA0My44NzczIDM3LjE1OTIgNDEuNjI2OCAzNy4xNTUzIDQwLjE1ODZMMzcuMDgyMSAxMS42NDQ5QzM3LjA4MDEgMTAuOTU1OSAzNi43MjI3IDEwLjMzOTcgMzYuMTI2IDkuOTk1OTdDMzUuNTI2NCA5LjY1MDc2IDM0LjgxNTUgOS42NTI3MSAzNC4yMTk4IDkuOTk2OTVMMTEuODUzNiAyMi45MDk1QzEwLjU3MTMgMjMuNjUwMyA5LjI2ODU5IDI1LjkwMDggOS4yNzI1IDI3LjM2ODVaIiBmaWxsPSIjMDMwRjM2Ii8+CjxwYXRoIGQ9Ik0xMi45MzY2IDMyLjA5NDZDMTIuNzE1OSAzMi4wOTQ2IDEyLjUzNzEgMzEuOTE2NCAxMi41MzYyIDMxLjY5NTdMMTIuNTI0NCAyNy4zNTk4QzEyLjUyNDQgMjcuMjE2NyAxMi42MDA2IDI3LjA4MzkgMTIuNzI0NiAyNy4wMTI2TDE2LjY0ODUgMjQuNzQ3QzE2LjgzODkgMjQuNjM2MSAxNy4wODQgMjQuNzAyIDE3LjE5NTMgMjQuODkzQzE3LjMwNTcgMjUuMDg0NCAxNy4yNDAzIDI1LjMyOSAxNy4wNDg5IDI1LjQzOTNMMTMuMzI1MiAyNy41ODkyTDEzLjMzNjkgMzEuNjkzN0MxMy4zMzY5IDMxLjkxNDQgMTMuMTU3MyAzMi4wOTQxIDEyLjkzNjYgMzIuMDk0NloiIGZpbGw9IiMwMzBGMzYiLz4KPHBhdGggZD0iTTMzLjQ1NDEgMjAuMzk3OEMzMy4yMzM0IDIwLjM5NzggMzMuMDU0NyAyMC4yMTk2IDMzLjA1MzcgMTkuOTk4OUwzMy4wNDQgMTYuMzUzNEwyOS43MTg4IDE4LjI3MjhDMjkuNTI4MyAxOC4zODM3IDI5LjI4MzIgMTguMzE4NyAyOS4xNzE5IDE4LjEyNjhDMjkuMDYxNSAxNy45MzU0IDI5LjEyNyAxNy42OTA4IDI5LjMxODQgMTcuNTgwNEwzMy4yNDIyIDE1LjMxNTNDMzMuMzY3MiAxNS4yNDMgMzMuNTE4NiAxNS4yNDM1IDMzLjY0MTYgMTUuMzE0OEMzMy43NjU2IDE1LjM4NjEgMzMuODQxOCAxNS41MTc5IDMzLjg0MjggMTUuNjYwNUwzMy44NTQ1IDE5Ljk5NjlDMzMuODU0NSAyMC4yMTc3IDMzLjY3NDggMjAuMzk3MyAzMy40NTQxIDIwLjM5NzhaIiBmaWxsPSIjMDMwRjM2Ii8+CjxwYXRoIGQ9Ik0yOS41ODAxIDQyLjgzMzNDMjkuNDQyNCA0Mi44MzMzIDI5LjMwNzYgNDIuNzYxNSAyOS4yMzM0IDQyLjYzMzVDMjkuMTIzMSA0Mi40NDIxIDI5LjE4ODUgNDIuMTk3NSAyOS4zNzk5IDQyLjA4NzJMMzMuMTAyNiAzOS45Mzc3TDMzLjA5MDggMzUuODQzQzMzLjA5MDggMzUuNjIyMyAzMy4yNjk2IDM1LjQ0MjYgMzMuNDkwMyAzNS40NDIxQzMzLjcxMSAzNS40NDIxIDMzLjg5MDYgMzUuNjIwNCAzMy44OTE2IDM1Ljg0MTFMMzMuOTAzMyA0MC4xNjcyQzMzLjkwMzMgNDAuMzEwMyAzMy44MjcyIDQwLjQ0MzEgMzMuNzAzMSA0MC41MTQ0TDI5Ljc4MDMgNDIuNzc5NUMyOS43MTY4IDQyLjgxNjIgMjkuNjQ4NSA0Mi44MzMzIDI5LjU4MDEgNDIuODMzM1oiIGZpbGw9IiMwMzBGMzYiLz4KPHBhdGggZD0iTTEyLjk4NTQgNTIuMjY0OUMxMi45MTYgNTIuMjY0OSAxMi44NDc3IDUyLjI0NzMgMTIuNzg2MiA1Mi4yMTE3QzEyLjY2MjEgNTIuMTQwNCAxMi41ODYgNTIuMDA4NSAxMi41ODUgNTEuODY2TDEyLjU3MzMgNDcuNTM5OEMxMi41NzMzIDQ3LjMxOTEgMTIuNzUyIDQ3LjEzOTQgMTIuOTcyNyA0Ny4xMzg5QzEzLjE5MzQgNDcuMTM4OSAxMy4zNzMxIDQ3LjMxNzEgMTMuMzc0MSA0Ny41Mzc4TDEzLjM4MzggNTEuMTczMUwxNi43MDkgNDkuMjUzN0MxNi44OTk0IDQ5LjE0MzMgMTcuMTQ0NiA0OS4yMDgzIDE3LjI1NTkgNDkuMzk5N0MxNy4zNjYyIDQ5LjU5MTEgMTcuMzAwOCA0OS44MzU3IDE3LjEwOTQgNDkuOTQ2TDEzLjE4NTYgNTIuMjExMkMxMy4xMjMxIDUyLjI0NzMgMTMuMDU0NyA1Mi4yNjQ5IDEyLjk4NTQgNTIuMjY0OVoiIGZpbGw9IiMwMzBGMzYiLz4KPHBhdGggZD0iTTIzLjEyMTYgMjIuNjc5NUMyMy44MDQzIDIyLjI4NTMgMjQuMzU4IDIyLjYwMSAyNC4zNjAyIDIzLjM4NTVMMjQuMzg1IDMyLjEyMTNMMjQuMzYzOCAyNC42NDk0QzI0LjM2MTcgMjMuODk0IDI0Ljg5MSAyMi45NzcyIDI1LjU0ODQgMjIuNTk3N0MyNi4yMDU5IDIyLjIxOCAyNi43NDI5IDIyLjUxOTIgMjYuNzQ1IDIzLjI3NDZMMjYuNzY2MiAzMC43NDY1TDI2Ljc1NjkgMjcuNDQ0QzI2Ljc1NDYgMjYuNjQ5OCAyNy4zMDkxIDI1LjY4OTQgMjcuOTk1OSAyNS4yOTI5QzI4LjY4MjcgMjQuODk2MyAyOS4yNDUxIDI1LjIxMTkgMjkuMjQ3NCAyNi4wMDZMMjkuMjY1IDMyLjIyMzdDMjkuMjY2OSAzMi44OTIgMjkuMTUwOCAzMy42MTM5IDI4LjkyNDggMzQuMzYwM0wyNy44OTYxIDM3Ljc2MjZDMjcuNzc1IDM4LjE2MjQgMjcuNzEyNiAzOC41NDc2IDI3LjcxMzYgMzguOTAxMUwyNy43MTQ0IDM5LjE3NzFDMjcuNzE2MyAzOS44MzU3IDI3LjI1NDMgNDAuNjM1OSAyNi42ODUzIDQwLjk2NDVMMjEuNTY5MyA0My45MTgyQzIxLjAwMDUgNDQuMjQ2NiAyMC41MzUzIDQzLjk4MTYgMjAuNTMzNCA0My4zMjMxQzIwLjUzMTkgNDIuNzk1MiAyMC4zOTE0IDQyLjM1NzMgMjAuMTI4OSA0Mi4wNzI0TDE1Ljk0MTUgMzcuNTc4MkMxNS41ODU3IDM3LjE4MjIgMTUuNjg4OCAzNi4zMTI3IDE2LjE3NjMgMzUuNTcwNEMxNi4zOTg2IDM1LjIzNjggMTYuNjY4MSAzNC45NzkyIDE2LjkzNzUgMzQuODIzN0MxNy4yMjg3IDM0LjY1NTUgMTcuNTE5OSAzNC42MDY0IDE3Ljc1MjYgMzQuNzA4OEwxOS42MDQ0IDM1Ljc0NDhMMTkuNTc5NCAyNi45NDZDMTkuNTc3MyAyNi4yMSAyMC4wOTQgMjUuMzE1MSAyMC43MzQ2IDI0Ljk0NTJDMjEuMzcwOSAyNC41Nzc5IDIxLjg5MDkgMjQuODc0MiAyMS44OTMgMjUuNjEwM0wyMS45MTYxIDMzLjc1MDVMMjEuODkwNyAyNC44MTEzQzIxLjg4ODUgMjQuMDI2OCAyMi40Mzg4IDIzLjA3MzYgMjMuMTIxNiAyMi42Nzk1WiIgZmlsbD0id2hpdGUiLz4KPHBhdGggZD0iTTI5LjI2MzMgMzIuMjI1MkMyOS4yNjMzIDMyLjg5MzkgMjkuMTQ4NiAzMy42MTAzIDI4LjkyODkgMzQuMzU1M0wyNy44OTcyIDM3Ljc2NTVDMjcuNzczMSAzOC4xNjY3IDI3LjcxNTcgMzguNTQ4OCAyNy43MTU3IDM4LjkwMjJWMzkuMTc5M0MyNy43MTU3IDM5LjgzODQgMjcuMjU3MiA0MC42MzEyIDI2LjY4NCA0MC45NjU1TDIxLjU3MzkgNDMuOTE3MUMyMS4wMDA3IDQ0LjI0MTkgMjAuNTMyNCA0My45ODQgMjAuNTMyNCA0My4zMjQ5QzIwLjUzMjQgNDIuNzk5NSAyMC4zODkyIDQyLjM2MDEgMjAuMTMxMyA0Mi4wNzM2TDE5Ljg5MjUgNDEuODE1NkMyNC40NTgzIDQxLjEwODggMjcuOTkyOCAzNi40NDczIDI3Ljk5MjggMzAuODAxOUMyNy45OTI4IDI5LjE0OTQgMjcuNjg3MyAyNy41ODI4IDI3LjE0MyAyNi4xNjkxQzI3LjM2MjIgMjUuODA2MSAyNy42NjgxIDI1LjQ4MTMgMjcuOTkyOCAyNS4yOTAzQzI4LjY4MDcgMjQuODk4NyAyOS4yNDQyIDI1LjIxMzkgMjkuMjQ0MiAyNi4wMDY3TDI5LjI2MzMgMzIuMjI1MloiIGZpbGw9IiNFOUVERjQiLz4KPHBhdGggZD0iTTIxLjEwNTUgNDQuNDU3OUMyMC45Mzc1IDQ0LjQ1NzkgMjAuNzc5MyA0NC40MTc5IDIwLjYzNzcgNDQuMzM2OEMyMC4zMTg0IDQ0LjE1MjcgMjAuMTM0OCA0My43ODQxIDIwLjEzMjggNDMuMzI0MUMyMC4xMzI4IDQyLjg5OTggMjAuMDI2NCA0Mi41NTEyIDE5LjgzNSA0Mi4zNDMyTDE1LjY0ODUgMzcuODUwNUMxNS4xNjIxIDM3LjMwODUgMTUuMjQ1MiAzNi4yNTkyIDE1Ljg0MTggMzUuMzUwNUMxNi4wOTU3IDM0Ljk3MDEgMTYuNDA1MyAzNC42Njg5IDE2LjczODMgMzQuNDc3QzE3LjE1MDQgMzQuMjM4NyAxNy41Njg0IDM0LjE5MTggMTcuOTE0MSAzNC4zNDI3TDE5LjIwMjIgMzUuMDYxOUwxOS4xNzg3IDI2Ljk0NjdDMTkuMTc2OCAyNi4wNzAyIDE5Ljc3MjUgMjUuMDM4NSAyMC41MzQyIDI0LjU5ODVDMjAuODc0MSAyNC40MDE4IDIxLjIyMzcgMjQuMzQyMiAyMS41MjQ1IDI0LjQyMzdDMjEuNjY0MSAyMy41OTkgMjIuMjI3NiAyMi43MzM4IDIyLjkyMDkgMjIuMzMzNEMyMy4zNzUgMjIuMDcxMiAyMy44Mzk5IDIyLjAzOTUgMjQuMTk4MyAyMi4yNDVDMjQuNDE3IDIyLjM3MTUgMjQuNTc5MSAyMi41Nzc1IDI0LjY3MTkgMjIuODM4M0MyNC44NzExIDIyLjU5NzYgMjUuMTAxNiAyMi4zOTQgMjUuMzQ4NyAyMi4yNTA5QzI1Ljc5MiAyMS45OTU1IDI2LjI0NDIgMjEuOTYzMyAyNi41OTY3IDIyLjE2NjRDMjYuOTQ0NCAyMi4zNjYxIDI3LjE0MzYgMjIuNzY5NCAyNy4xNDU1IDIzLjI3MzRMMjcuMTUxNCAyNS40ODgyQzI3LjM0NDggMjUuMjY4IDI3LjU2MjUgMjUuMDgxIDI3Ljc5NTkgMjQuOTQ2MkMyOC4yNTM5IDI0LjY4MyAyOC43MjA3IDI0LjY1MDggMjkuMDgxMSAyNC44NTgzQzI5LjQzOTUgMjUuMDY0NCAyOS42NDU1IDI1LjQ4MjMgMjkuNjQ3NSAyNi4wMDQ4TDI5LjY2NTEgMzIuMjIyNkMyOS42NjcgMzIuOTI3MiAyOS41NDY5IDMzLjY4NTUgMjkuMzA3NyAzNC40NzZMMjguMjc5MyAzNy44NzgzQzI4LjE2OSAzOC4yNDQxIDI4LjExMzMgMzguNTg3MyAyOC4xMTQzIDM4Ljg5OThMMjguMTE1MyAzOS4xNzU3QzI4LjExNjIgMzkuOTc0IDI3LjU3NjIgNDAuOTExNSAyNi44ODU4IDQxLjMxMDVMMjEuNzY5NiA0NC4yNjQxQzIxLjU0NTkgNDQuMzkzIDIxLjMxODQgNDQuNDU3OSAyMS4xMDU1IDQ0LjQ1NzlaTTE3LjQ5ODEgMzUuMDQ4N0MxNy40MTMxIDM1LjA0ODcgMTcuMjc5MyAzNS4wODgzIDE3LjEzNzcgMzUuMTY5OEMxNi45MTMxIDM1LjI5OTIgMTYuNjkwNSAzNS41MTk5IDE2LjUwODggMzUuNzkyNEMxNi4xMDI2IDM2LjQxMDEgMTYuMDQwMSAzNy4wODkzIDE2LjIzOTMgMzcuMzEwOUwyMC40MjE5IDQxLjc5OTdDMjAuNzU1OSA0Mi4xNjIgMjAuOTMxNyA0Mi42ODg0IDIwLjkzMzYgNDMuMzIyMkMyMC45MzM2IDQzLjUxNTUgMjAuOTg5MyA0My42MTYxIDIxLjAzNzEgNDMuNjQzNUMyMS4wODcgNDMuNjcwOCAyMS4yMDAyIDQzLjY2ODkgMjEuMzY5MiA0My41NzEyTDI2LjQ4NTQgNDAuNjE4MUMyNi45Mjc4IDQwLjM2MjIgMjcuMzE1NSAzOS42ODg5IDI3LjMxNDUgMzkuMTc3NkwyNy4zMTM1IDM4LjkwMjNDMjcuMzEyNSAzOC41MTAyIDI3LjM3OTkgMzguMDg3OCAyNy41MTM3IDM3LjY0NjlMMjguNTQyIDM0LjI0NDVDMjguNzU3OCAzMy41Mjk3IDI4Ljg2NjIgMzIuODUgMjguODY0MyAzMi4yMjQ1TDI4Ljg0NjcgMjYuMDA2N0MyOC44NDY3IDI1Ljc4MDcgMjguNzg1MiAyNS42MTA4IDI4LjY4MTcgMjUuNTUxN0MyOC41NzYyIDI1LjQ4OTIgMjguMzk1NSAyNS41MjQzIDI4LjE5NjMgMjUuNjM5MUMyNy42Mzg3IDI1Ljk2MDkgMjcuMTY4IDI2Ljc2OSAyNy4xNTczIDI3LjQxNjRMMjcuMTY3IDMwLjc0NTVDMjcuMTY3IDMwLjk2NjIgMjYuOTg4MyAzMS4xNDU5IDI2Ljc2NzYgMzEuMTQ2NEMyNi41NDY5IDMxLjE0NjQgMjYuMzY3MiAzMC45NjgyIDI2LjM2NjIgMzAuNzQ3NUwyNi4zNTY1IDI3LjQ0NDdDMjYuMzU2NSAyNy40MzQgMjYuMzU2NSAyNy40MjMzIDI2LjM1NzUgMjcuNDEyNUwyNi4zNDQ4IDIzLjI3NTNDMjYuMzQ0OCAyMy4wNjc4IDI2LjI4OTEgMjIuOTEyNSAyNi4xOTczIDIyLjg1OThDMjYuMTAzNiAyMi44MDQxIDI1LjkzNDYgMjIuODM2OCAyNS43NDkxIDIyLjk0MzhDMjUuMjEyOSAyMy4yNTI4IDI0Ljc2MTggMjQuMDMzMSAyNC43NjQ3IDI0LjY0NzlMMjQuNzg1MiAzMi4xMjA1QzI0Ljc4NTIgMzIuMzQxMiAyNC42MDY1IDMyLjUyMDkgMjQuMzg1OCAzMi41MjE0QzI0LjE2NTEgMzIuNTIxNCAyMy45ODU0IDMyLjM0MzIgMjMuOTg0NCAzMi4xMjI1TDIzLjk2IDIzLjM4NjZDMjMuOTYgMjMuMTY0IDIzLjg5OTUgMjIuOTk2IDIzLjc5ODkgMjIuOTM4NEMyMy42OTkzIDIyLjg3OTMgMjMuNTIwNSAyMi45MTI1IDIzLjMyMTMgMjMuMDI2M0MyMi43NjA4IDIzLjM0OTUgMjIuMjg5MSAyNC4xNjY0IDIyLjI5MTEgMjQuODEwNUwyMi4zMTY0IDMzLjc0OTRDMjIuMzE2NCAzMy45NzAxIDIyLjEzNzcgMzQuMTQ5OCAyMS45MTcgMzQuMTUwM0MyMS42OTYzIDM0LjE1MDMgMjEuNTE2NiAzMy45NzIxIDIxLjUxNTcgMzMuNzUxNEwyMS40OTIyIDI1LjYxMTJDMjEuNDkyMiAyNS40MTEgMjEuNDM5NSAyNS4yNjExIDIxLjM1MjYgMjUuMjExM0MyMS4yNjk2IDI1LjE2MjUgMjEuMTA2NSAyNS4xOTMzIDIwLjkzNDYgMjUuMjkxOUMyMC40MTUxIDI1LjU5MTIgMTkuOTc3NiAyNi4zNDg1IDE5Ljk3OTUgMjYuOTQ0N0wyMC4wMDQ5IDM1Ljc0MzZDMjAuMDA0OSAzNS44ODU3IDE5LjkyOTcgMzYuMDE3IDE5LjgwNzcgMzYuMDg5M0MxOS42ODY2IDM2LjE2MTUgMTkuNTM0MiAzNi4xNjQ1IDE5LjQwOTIgMzYuMDkzN0wxNy41NTc3IDM1LjA1OEMxNy41NDIgMzUuMDUxNyAxNy41MjI1IDM1LjA0ODcgMTcuNDk4MSAzNS4wNDg3WiIgZmlsbD0iIzAzMEYzNiIvPgo8L3N2Zz4K';

const POINTS = [
    {text: 'pulso', value: 'wrist'},
    {text: 'base do polegar', value: 'thumb_cmc'},
    {text: 'junta do polegar', value: 'thumb_mcp'},
    {text: 'articulação do polegar', value: 'thumb_ip'},
    {text: 'ponta do polegar', value: 'thumb_tip'},
    {text: 'base do indicador', value: 'index_finger_mcp'},
    {text: 'meio do indicador', value: 'index_finger_pip'},
    {text: 'articulação do indicador', value: 'index_finger_dip'},
    {text: 'ponta do indicador', value: 'index_finger_tip'},
    {text: 'base do dedo médio', value: 'middle_finger_mcp'},
    {text: 'meio do dedo médio', value: 'middle_finger_pip'},
    {text: 'articulação do dedo médio', value: 'middle_finger_dip'},
    {text: 'ponta do dedo médio', value: 'middle_finger_tip'},
    {text: 'base do anelar', value: 'ring_finger_mcp'},
    {text: 'meio do anelar', value: 'ring_finger_pip'},
    {text: 'articulação do anelar', value: 'ring_finger_dip'},
    {text: 'ponta do anelar', value: 'ring_finger_tip'},
    {text: 'base do mindinho', value: 'pinky_finger_mcp'},
    {text: 'meio do mindinho', value: 'pinky_finger_pip'},
    {text: 'articulação do mindinho', value: 'pinky_finger_dip'},
    {text: 'ponta do mindinho', value: 'pinky_finger_tip'}
];

const POINT_ALIASES = POINTS.reduce((aliases, point) => {
    aliases[point.value] = point.value;
    aliases[point.text] = point.value;
    return aliases;
}, {});

const GESTURES = ['mão aberta', 'mão fechada', 'apontando', 'pinça'];
const DEFAULT_CUSTOM_GESTURE_ID = 'other';

class Scratch3HandPoseDetectionBlocks {
    constructor (runtime) {
        this.runtime = runtime;
    }

    get EXTENSION_ID () {
        return 'handPoseDetection';
    }

    getInfo () {
        return [{
            id: 'handPoseDetection',
            name: formatMessage({
                id: 'handPoseDetection.categoryName',
                default: 'Hand Pose Detection',
                description: 'Name of the hand pose detection extension'
            }),
            color1: '#00A676',
            color2: '#008B63',
            color3: '#006B4D',
            blockIconURI: blockIconURI,
            menuIconURI: blockIconURI,
            blocks: [
                {
                    opcode: 'startDetection',
                    text: formatMessage({
                        id: 'handPoseDetection.startDetection',
                        default: 'start hand detector',
                        description: 'Command that starts the hand detector'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'stopDetection',
                    text: formatMessage({
                        id: 'handPoseDetection.stopDetection',
                        default: 'stop hand detector',
                        description: 'Command that stops the hand detector'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'openResult',
                    text: formatMessage({
                        id: 'handPoseDetection.openResult',
                        default: 'open hand detector',
                        description: 'Command that opens the hand pose detection result window'
                    }),
                    blockType: BlockType.COMMAND
                },
                {
                    opcode: 'openGestureTrainer',
                    text: formatMessage({
                        id: 'handPoseDetection.openGestureTrainer',
                        default: 'open gesture training',
                        description: 'Command that opens custom hand gesture training'
                    }),
                    blockType: BlockType.COMMAND
                },
                '---',
                {
                    opcode: 'createTrainedGesture',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.createTrainedGesture',
                        default: 'create gesture [NAME]',
                        description: 'Command that creates a custom hand gesture'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        NAME: {
                            type: ArgumentType.STRING,
                            defaultValue: 'Número 1'
                        }
                    }
                },
                {
                    opcode: 'addGestureExample',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.addGestureExample',
                        default: 'add example to gesture [GESTURE]',
                        description: 'Command that captures one custom gesture example'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                {
                    opcode: 'captureGestureExamplesForSeconds',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.captureGestureExamplesForSeconds',
                        default: 'capture examples of gesture [GESTURE] for [SECONDS] seconds',
                        description: 'Command that captures custom gesture examples for a duration'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        },
                        SECONDS: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 3
                        }
                    }
                },
                {
                    opcode: 'clearGestureExamples',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.clearGestureExamples',
                        default: 'delete examples of gesture [GESTURE]',
                        description: 'Command that deletes custom gesture examples'
                    }),
                    blockType: BlockType.COMMAND,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                {
                    opcode: 'gestureExampleCount',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.gestureExampleCount',
                        default: 'number of examples of gesture [GESTURE]',
                        description: 'Reporter for custom gesture example count'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                {
                    opcode: 'gestureModelReady',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.gestureModelReady',
                        default: 'gesture model ready?',
                        description: 'Boolean reporter for custom gesture model readiness'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'whenTrainedGestureDetected',
                    text: formatMessage({
                        id: 'handPoseDetection.whenTrainedGestureDetected',
                        default: 'when trained gesture [GESTURE] is recognized ' +
                            'with confidence greater than [CONFIDENCE] %',
                        description: 'Hat that triggers for a trained hand gesture'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        },
                        CONFIDENCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 80
                        }
                    }
                },
                {
                    opcode: 'recognizedTrainedGesture',
                    text: formatMessage({
                        id: 'handPoseDetection.recognizedTrainedGesture',
                        default: 'recognized trained gesture',
                        description: 'Reporter for the recognized trained hand gesture'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'trainedGestureConfidence',
                    text: formatMessage({
                        id: 'handPoseDetection.trainedGestureConfidence',
                        default: 'confidence of trained gesture [GESTURE]',
                        description: 'Reporter for confidence of a trained hand gesture'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'TRAINED_GESTURES',
                            defaultValue: this._defaultTrainedGesture()
                        }
                    }
                },
                '---',
                {
                    opcode: 'whenGestureDetected',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.whenGestureDetected',
                        default: 'when detect gesture [GESTURE] with confidence > [CONFIDENCE]',
                        description: 'Hat that triggers when a hand gesture is detected with enough confidence'
                    }),
                    blockType: BlockType.HAT,
                    arguments: {
                        GESTURE: {
                            type: ArgumentType.STRING,
                            menu: 'GESTURE',
                            defaultValue: GESTURES[0]
                        },
                        CONFIDENCE: {
                            type: ArgumentType.NUMBER,
                            defaultValue: 80
                        }
                    }
                },
                {
                    opcode: 'handDetected',
                    text: formatMessage({
                        id: 'handPoseDetection.handDetected',
                        default: 'hand detected?',
                        description: 'Boolean reporter for whether any hand is currently detected'
                    }),
                    blockType: BlockType.BOOLEAN
                },
                {
                    opcode: 'handCount',
                    text: formatMessage({
                        id: 'handPoseDetection.handCount',
                        default: 'hand count',
                        description: 'Reporter for the number of detected hands'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'recognizedGesture',
                    hideFromPalette: true,
                    text: formatMessage({
                        id: 'handPoseDetection.recognizedGesture',
                        default: 'recognized gesture',
                        description: 'Reporter for the current recognized hand gesture'
                    }),
                    blockType: BlockType.REPORTER
                },
                {
                    opcode: 'handedness',
                    text: formatMessage({
                        id: 'handPoseDetection.handedness',
                        default: 'side of hand [HAND]',
                        description: 'Reporter for the handedness of a detected hand'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        HAND: {
                            type: ArgumentType.NUMBER,
                            menu: 'HAND',
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'keypointPosition',
                    text: formatMessage({
                        id: 'handPoseDetection.keypointPosition',
                        default: 'position [AXIS] of point [POINT] of hand [HAND]',
                        description: 'Reporter for a hand keypoint coordinate'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        AXIS: {
                            type: ArgumentType.STRING,
                            menu: 'AXIS',
                            defaultValue: 'x'
                        },
                        POINT: {
                            type: ArgumentType.STRING,
                            menu: 'POINT',
                            defaultValue: 'wrist'
                        },
                        HAND: {
                            type: ArgumentType.NUMBER,
                            menu: 'HAND',
                            defaultValue: 1
                        }
                    }
                },
                {
                    opcode: 'handConfidence',
                    text: formatMessage({
                        id: 'handPoseDetection.handConfidence',
                        default: 'confidence of hand [HAND]',
                        description: 'Reporter for a detected hand confidence'
                    }),
                    blockType: BlockType.REPORTER,
                    arguments: {
                        HAND: {
                            type: ArgumentType.NUMBER,
                            menu: 'HAND',
                            defaultValue: 1
                        }
                    }
                }
            ],
            menus: {
                HAND: {
                    acceptReporters: true,
                    items: [
                        {text: '1', value: 1},
                        {text: '2', value: 2}
                    ]
                },
                AXIS: {
                    acceptReporters: true,
                    items: ['x', 'y', 'z']
                },
                POINT: {
                    acceptReporters: true,
                    items: POINTS
                },
                GESTURE: {
                    acceptReporters: true,
                    items: GESTURES
                },
                TRAINED_GESTURES: {
                    acceptReporters: true,
                    items: this._trainedGestureMenu()
                }
            }
        }];
    }

    openResult () {
        if (this.runtime.vm && typeof this.runtime.vm.openHandPoseDetectionResult === 'function') {
            this.runtime.vm.openHandPoseDetectionResult();
        } else {
            this.runtime.emit('HAND_POSE_DETECTION_OPEN_RESULT');
        }
    }

    startDetection () {
        if (this.runtime.vm && typeof this.runtime.vm.startHandPoseDetection === 'function') {
            return this.runtime.vm.startHandPoseDetection();
        }
        this.openResult();
    }

    stopDetection () {
        if (this.runtime.vm && typeof this.runtime.vm.stopHandPoseDetection === 'function') {
            return this.runtime.vm.stopHandPoseDetection();
        }
    }

    openGestureTrainer () {
        if (this.runtime.vm && typeof this.runtime.vm.openHandPoseGestureTrainer === 'function') {
            this.runtime.vm.openHandPoseGestureTrainer();
        } else {
            this.runtime.emit('HAND_POSE_DETECTION_OPEN_TRAINER');
        }
    }

    createTrainedGesture (args) {
        const name = Cast.toString(args.NAME).trim()
            .slice(0, 40);
        if (!name || !this.runtime.vm || typeof this.runtime.vm.createHandPoseGesture !== 'function') return;
        this.openGestureTrainer();
        return this.runtime.vm.createHandPoseGesture(name);
    }

    addGestureExample (args) {
        if (!this.runtime.vm || typeof this.runtime.vm.captureHandPoseGestureExample !== 'function') return;
        this.openGestureTrainer();
        return this.runtime.vm.captureHandPoseGestureExample(Cast.toString(args.GESTURE));
    }

    captureGestureExamplesForSeconds (args) {
        if (!this.runtime.vm || typeof this.runtime.vm.captureHandPoseGestureExamplesForSeconds !== 'function') return;
        const seconds = Math.max(1, Math.min(10, Cast.toNumber(args.SECONDS) || 3));
        this.openGestureTrainer();
        return this.runtime.vm.captureHandPoseGestureExamplesForSeconds(Cast.toString(args.GESTURE), seconds);
    }

    clearGestureExamples (args) {
        if (!this.runtime.vm || typeof this.runtime.vm.clearHandPoseGestureExamples !== 'function') return;
        return this.runtime.vm.clearHandPoseGestureExamples(Cast.toString(args.GESTURE));
    }

    gestureExampleCount (args) {
        const classId = Cast.toString(args.GESTURE);
        return this._examples().filter(example => example && example.classId === classId).length;
    }

    gestureModelReady () {
        const model = this._gestureModel();
        if (!model.active || model.incompatible) return false;
        return this._gestureClasses().length >= 2 && this._gestureClasses().every(item =>
            this._examples().filter(example => example && example.classId === item.id).length >= 20
        );
    }

    whenTrainedGestureDetected (args) {
        const classId = Cast.toString(args.GESTURE);
        const prediction = this._gesturePrediction();
        return prediction.classId === classId &&
            Cast.toNumber((prediction.confidences || {})[classId] || 0) > Cast.toNumber(args.CONFIDENCE);
    }

    recognizedTrainedGesture (args, util) {
        this._openResultIfStackClick(util);
        const prediction = this._gesturePrediction();
        return prediction.classId === DEFAULT_CUSTOM_GESTURE_ID ? '' : (prediction.label || '');
    }

    trainedGestureConfidence (args) {
        const classId = Cast.toString(args.GESTURE);
        return Math.round(Cast.toNumber((this._gesturePrediction().confidences || {})[classId] || 0));
    }

    handDetected (args, util) {
        this._openResultIfStackClick(util);
        return this._result().handCount > 0;
    }

    handCount (args, util) {
        this._openResultIfStackClick(util);
        return this._result().handCount || 0;
    }

    recognizedGesture (args, util) {
        this._openResultIfStackClick(util);
        return this._result().gesture || '';
    }

    handedness (args, util) {
        this._openResultIfStackClick(util);
        const hand = this._hand(args.HAND);
        return hand ? hand.handedness || '' : '';
    }

    keypointPosition (args, util) {
        this._openResultIfStackClick(util);
        const hand = this._hand(args.HAND);
        if (!hand || !Array.isArray(hand.keypoints)) return 0;
        const pointName = this._normalizePointName(args.POINT);
        const axis = Cast.toString(args.AXIS).toLowerCase();
        if (['x', 'y', 'z'].indexOf(axis) === -1) return 0;
        const point = hand.keypoints.find(item => item && item.name === pointName);
        return point ? Cast.toNumber(point[axis]) : 0;
    }

    handConfidence (args, util) {
        this._openResultIfStackClick(util);
        const hand = this._hand(args.HAND);
        return hand ? Math.round(Cast.toNumber(hand.score) * 100) : 0;
    }

    whenGestureDetected (args) {
        const result = this._result();
        const expectedGesture = Cast.toString(args.GESTURE);
        const minConfidence = Cast.toNumber(args.CONFIDENCE);
        return result.gesture === expectedGesture && Cast.toNumber(result.confidence || 0) > minConfidence;
    }

    _openResultIfStackClick (util) {
        if (util && util.thread && util.thread.stackClick) {
            this.openResult();
        }
    }

    _result () {
        return this.runtime.handPoseDetectionResult || {
            handCount: 0,
            gesture: '',
            confidence: 0,
            hands: []
        };
    }

    _hand (handIndex) {
        const index = Math.max(1, Math.round(Cast.toNumber(handIndex || 1)));
        const hands = this._result().hands || [];
        return hands.find(hand => hand && hand.index === index) || hands[index - 1] || null;
    }

    _normalizePointName (pointName) {
        const key = Cast.toString(pointName);
        return POINT_ALIASES[key] || key;
    }

    _gestureModel () {
        return this.runtime.handPoseGestureModel || {};
    }

    _gesturePrediction () {
        return this.runtime.handPoseGesturePrediction || {
            classId: '',
            label: '',
            confidences: {}
        };
    }

    _gestureClasses () {
        const classes = this._gestureModel().classes;
        return Array.isArray(classes) ? classes : [];
    }

    _examples () {
        const examples = this._gestureModel().examples;
        return Array.isArray(examples) ? examples : [];
    }

    _defaultTrainedGesture () {
        const classes = this._gestureClasses();
        const customClass = classes.find(item => item && !item.protected);
        return customClass ? customClass.id : DEFAULT_CUSTOM_GESTURE_ID;
    }

    _trainedGestureMenu () {
        const classes = this._gestureClasses();
        if (!classes.length) {
            return [{
                text: 'Outro',
                value: DEFAULT_CUSTOM_GESTURE_ID
            }];
        }
        return classes.map(item => ({
            text: item.name,
            value: item.id
        }));
    }
}

module.exports = Scratch3HandPoseDetectionBlocks;
