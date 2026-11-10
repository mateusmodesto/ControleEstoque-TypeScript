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
-- produtos: espelho da interface Produto
-- o ENUM tem os mesmos valores do union type Categoria
-- -------------------------------------------------------------
CREATE TABLE produtos (
  id             INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nome           VARCHAR(120)  NOT NULL,
  descricao      TEXT          NULL,
  categoria      ENUM('alimentos', 'limpeza', 'papelaria', 'eletronicos') NOT NULL,
  quantidade     INT UNSIGNED  NOT NULL DEFAULT 0,
  estoque_minimo INT UNSIGNED  NOT NULL DEFAULT 0,
  preco          DECIMAL(10,2) NOT NULL,
  criado_em      DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_produtos PRIMARY KEY (id),
  CONSTRAINT ck_produtos_nome  CHECK (CHAR_LENGTH(TRIM(nome)) >= 3),
  CONSTRAINT ck_produtos_preco CHECK (preco > 0)
);

-- -------------------------------------------------------------
-- movimentacoes: o log. Cada cadastro, entrada, saída ou exclusão
-- vira uma linha. O nome do produto é copiado de propósito: se o
-- produto for excluído, o histórico continua legível (produto_id
-- vira NULL, mas produto_nome permanece).
-- -------------------------------------------------------------
CREATE TABLE movimentacoes (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  produto_id    INT UNSIGNED NULL,
  produto_nome  VARCHAR(120) NOT NULL,
  tipo          ENUM('cadastro', 'entrada', 'saida', 'exclusao') NOT NULL,
  quantidade    INT UNSIGNED NOT NULL,   -- quantas unidades se moveram
  saldo         INT UNSIGNED NOT NULL,   -- quanto ficou em estoque depois
  criado_em     DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT pk_movimentacoes PRIMARY KEY (id),
  CONSTRAINT fk_movimentacoes_produto FOREIGN KEY (produto_id)
    REFERENCES produtos (id) ON DELETE SET NULL
);

-- -------------------------------------------------------------
-- DADOS DE EXEMPLO — os mesmos seis produtos do dados.ts
-- -------------------------------------------------------------
INSERT INTO produtos (nome, descricao, categoria, quantidade, estoque_minimo, preco) VALUES
  ('Arroz 5kg',         NULL,                    'alimentos',   40,  10, 29.90),
  ('Detergente',        'Caixa com 12 unidades', 'limpeza',      4,   8, 24.50),
  ('Caderno 96 folhas', NULL,                    'papelaria',  120,  30, 14.90),
  ('Mouse sem fio',     'Modelo USB',            'eletronicos',  0,   5, 59.90),
  ('Feijão 1kg',        NULL,                    'alimentos',    6,  15,  8.70),
  ('Caneta azul',       NULL,                    'papelaria',  200,  50,  2.50);

-- Conferência: deve listar 6 produtos
-- SELECT id, nome, categoria, quantidade, estoque_minimo, preco FROM produtos;
