# Study App

Este app recebe cursos e questões em JSON, lista os simulados disponíveis, deixa o usuário responder e mostra o resultado final.

## Como adicionar um curso

Crie uma pasta em:

`data/course-banks/<slug>/`

Dentro dela, adicione:

- `metadata.json`
- `question-bank.json`

O app detecta automaticamente esse novo curso na home.

## Como adicionar as questões

As questões ficam em:

`data/course-banks/<slug>/question-bank.json`

Formato:

```json
{
  "questions": []
}
```

O campo `files` pode existir, mas é opcional e não é necessário para o app funcionar.

## Formato mínimo do curso

`metadata.json`

```json
{
  "slug": "example_course",
  "title": "Example Course",
  "language": "pt-BR",
  "provider": "Community",
  "instructor": "Example Instructor",
  "landingPage": "https://example.com/example-course",
  "modules": [
    {
      "slug": "intro_module",
      "title": "Intro Module",
      "order": 1,
      "key": "intro_module",
      "topics": [
        {
          "slug": "first_topic",
          "title": "First Topic"
        }
      ]
    }
  ]
}
```

## Formato mínimo da questão

Cada item de `questions` precisa ter no mínimo:

```json
{
  "id": "example-course-q1",
  "course": "example_course",
  "module_title": "Intro Module",
  "topic_title": "First Topic",
  "difficulty": "easy",
  "prompt": "Qual e o objetivo deste exemplo?",
  "options": [
    "Mostrar o contrato minimo",
    "Executar um pipeline externo",
    "Baixar arquivos remotos",
    "Gerar PDF automaticamente"
  ],
  "correct_option": 0,
  "explanation": "Este exemplo existe apenas para mostrar o contrato minimo esperado pelo app.",
  "recommended_review": {
    "topic_title": "First Topic",
    "why_review": "Reveja o formato para manter compatibilidade com o catalogo."
  }
}
```

Campos extras são permitidos. Se você gerar mais metadados, o app simplesmente ignora o que não usa.

## Exemplo

- [question-bank.json](examples/course-bank-example/question-bank.json)
- [metadata.json](examples/course-bank-example/metadata.json)

## Validação

```bash
npm run validate:banks
```

## Import opcional

Se você ainda usa um pipeline externo para gerar `quiz.json`, pode importar um módulo inteiro para o banco local:

```bash
make import COURSE="system_design" MODULE="day_05_estrategias_de_cache"
```
