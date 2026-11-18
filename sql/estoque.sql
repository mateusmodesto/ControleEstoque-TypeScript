-- =============================================================
-- Controle de Estoque — banco de dados MySQL 8 ou MariaDB (XAMPP)
-- Rode este script inteiro no MySQL Workbench (raio), na aba SQL
-- do phpMyAdmin (botão Executar) ou com:
--   mysql -u root -p < estoque.sql
-- Ele APAGA e recria o banco: use só em ambiente de aula.
-- =============================================================

SET NAMES utf8mb4;

DROP DATABASE IF EXISTS estoque;
CREATE DATABASE estoque
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE estoque;

-- -------------------------------------------------------------
-- setores: de quem é a responsabilidade pelos produtos.
-- Cada usuário (exceto o administrador) pertence a um setor e só
-- enxerga os produtos dele.
-- -------------------------------------------------------------
CREATE TABLE setores (
  id    INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nome  VARCHAR(60)  NOT NULL,
  CONSTRAINT pk_setores      PRIMARY KEY (id),
  CONSTRAINT uq_setores_nome UNIQUE (nome)
);

-- -------------------------------------------------------------
-- usuarios: quem usa o sistema
-- perfil 'administrador' enxerga todos os setores (setor_id NULL);
-- perfil 'setor' enxerga só o seu (setor_id obrigatório).
-- -------------------------------------------------------------
CREATE TABLE usuarios (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome        VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL,
  senha_hash  CHAR(60)      NOT NULL,          -- hash bcrypt, NUNCA a senha
  perfil      ENUM('administrador', 'setor') NOT NULL DEFAULT 'setor',
  setor_id    INT UNSIGNED  NULL,
  criado_em   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_usuarios        PRIMARY KEY (id),
  CONSTRAINT uq_usuarios_email  UNIQUE (email),
  CONSTRAINT fk_usuarios_setor  FOREIGN KEY (setor_id) REFERENCES setores (id),
  CONSTRAINT ck_usuarios_perfil CHECK (
    (perfil = 'administrador' AND setor_id IS NULL) OR
    (perfil = 'setor'         AND setor_id IS NOT NULL)
  )
);

-- -------------------------------------------------------------
-- produtos: espelho da interface Produto
-- o ENUM tem os mesmos valores do union type Categoria
-- -------------------------------------------------------------
CREATE TABLE produtos (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome           VARCHAR(120)  NOT NULL,
  descricao      TEXT          NULL,
  categoria      ENUM('alimentos', 'limpeza', 'papelaria', 'eletronicos') NOT NULL,
  setor_id       INT UNSIGNED  NOT NULL,        -- o setor responsável
  quantidade     INT UNSIGNED  NOT NULL DEFAULT 0,
  estoque_minimo INT UNSIGNED  NOT NULL DEFAULT 0,
  preco          DECIMAL(10,2) NOT NULL,
  criado_em      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_produtos PRIMARY KEY (id),
  CONSTRAINT fk_produtos_setor FOREIGN KEY (setor_id) REFERENCES setores (id),
  CONSTRAINT ck_produtos_nome  CHECK (CHAR_LENGTH(TRIM(nome)) >= 3),
  CONSTRAINT ck_produtos_preco CHECK (preco > 0),
  INDEX ix_produtos_setor (setor_id)
);

-- -------------------------------------------------------------
-- movimentacoes: o log. Cada cadastro, entrada, saída ou exclusão
-- vira uma linha. O nome do produto e o setor são copiados de
-- propósito: se o produto for excluído, o histórico continua legível
-- e continua sendo do setor certo (produto_id vira NULL).
-- -------------------------------------------------------------
CREATE TABLE movimentacoes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  produto_id    INT UNSIGNED NULL,
  produto_nome  VARCHAR(120) NOT NULL,
  setor_id      INT UNSIGNED NOT NULL,
  tipo          ENUM('cadastro', 'entrada', 'saida', 'exclusao') NOT NULL,
  quantidade    INT UNSIGNED NOT NULL,   -- quantas unidades se moveram
  saldo         INT UNSIGNED NOT NULL,   -- quanto ficou em estoque depois
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_movimentacoes PRIMARY KEY (id),
  CONSTRAINT fk_movimentacoes_produto FOREIGN KEY (produto_id)
    REFERENCES produtos (id) ON DELETE SET NULL,
  CONSTRAINT fk_movimentacoes_setor FOREIGN KEY (setor_id) REFERENCES setores (id),
  INDEX ix_movimentacoes_setor (setor_id)
);

-- =============================================================
-- DADOS DE EXEMPLO
-- =============================================================
INSERT INTO setores (nome) VALUES
  ('T.I.'),              -- id 1
  ('Administrativo'),    -- id 2
  ('Serviços Gerais'),   -- id 3
  ('Cozinha');           -- id 4

INSERT INTO produtos (nome, descricao, categoria, setor_id, quantidade, estoque_minimo, preco) VALUES
  ('Arroz 5kg',         NULL,                    'alimentos',   4,  40,  10, 29.90),
  ('Detergente',        'Caixa com 12 unidades', 'limpeza',     3,   4,   8, 24.50),
  ('Caderno 96 folhas', NULL,                    'papelaria',   2, 120,  30, 14.90),
  ('Mouse sem fio',     'Modelo USB',            'eletronicos', 1,   0,   5, 59.90),
  ('Feijão 1kg',        NULL,                    'alimentos',   4,   6,  15,  8.70),
  ('Caneta azul',       NULL,                    'papelaria',   2, 200,  50,  2.50);

-- Usuários de demonstração. Senha dos dois: senha123
INSERT INTO usuarios (nome, email, senha_hash, perfil, setor_id) VALUES
  ('Administrador', 'admin@estoque.dev', '$2b$10$2NXM.XQux.rT2S/rojg/KeWVMQDcaSejyge3jFoxsxww3WGAfUnxm', 'administrador', NULL),
  ('Usuário T.I.',  'ti@estoque.dev',    '$2b$10$2NXM.XQux.rT2S/rojg/KeWVMQDcaSejyge3jFoxsxww3WGAfUnxm', 'setor',         1);

-- Conferência: o administrador vê 6 produtos; o T.I. vê só o Mouse
-- SELECT p.id, p.nome, s.nome AS setor FROM produtos p JOIN setores s ON s.id = p.setor_id;
