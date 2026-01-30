-- Database Schema for GG - Gestão de Gente
CREATE DATABASE IF NOT EXISTS folha_pv;
USE folha_pv;

-- Table for system users
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    usuario VARCHAR(100) NOT NULL UNIQUE,
    senha VARCHAR(255) NOT NULL,
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Table for institution settings and general configuration
CREATE TABLE IF NOT EXISTS settings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    tipo VARCHAR(50) NOT NULL,
    valor TEXT NOT NULL
);

-- Table for employees (professionals)
CREATE TABLE IF NOT EXISTS professionals (
    id INT AUTO_INCREMENT PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    matricula VARCHAR(50) NOT NULL UNIQUE,
    cargo VARCHAR(100),
    unidade_lotacao VARCHAR(100),
    unidade_exercicio VARCHAR(100),
    carga_horaria VARCHAR(50),
    email VARCHAR(255),
    telefone VARCHAR(20),
    data_nascimento DATE,
    escala VARCHAR(50),
    situacao VARCHAR(20) DEFAULT 'ATIVO',
    criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    atualizado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
