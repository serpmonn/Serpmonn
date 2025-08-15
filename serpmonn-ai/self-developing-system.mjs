import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";

// Загрузка .env файла
dotenv.config({ path: '/var/www/serpmonn.ru/serpmonn-ai/.env' });

// --- Конфигурация из .env ---
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = process.env.MODEL_NAME;

// --- Пути к файлам ---
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const TOOLS_FILE = path.join(__dirname, "tools.json");

// --- Инициализация Gemini ---
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// --- Реестр инструментов ---
function loadTools() {
  if (!fs.existsSync(TOOLS_FILE)) {
    return { tools: [] };
  }
  return JSON.parse(fs.readFileSync(TOOLS_FILE, "utf-8"));
}

function saveTools(tools) {
  fs.writeFileSync(TOOLS_FILE, JSON.stringify(tools, null, 2));
}

// --- Генерация инструмента ---
async function generateTool(taskDescription) {
  const prompt = `
    Напиши функцию на JavaScript для: ${taskDescription}.
    Требования:
    1. Безопасный код (никаких eval, shell-команд)
    2. Используй ES Modules (export)
    3. Добавь JSDoc-описание
  `;

  const result = await model.generateContent(prompt);
  return result.response.text();
}

// --- Регистрация инструмента ---
async function registerNewTool(toolName, description, generatedCode) {
  const tools = loadTools();
  
  if (tools.tools.some(tool => tool.name === toolName)) {
    console.log(`Инструмент "${toolName}" уже существует`);
    return false;
  }

  tools.tools.push({
    name: toolName,
    description,
    code: generatedCode
  });
  saveTools(tools);

  const moduleDir = path.join(__dirname, "tools");
  if (!fs.existsSync(moduleDir)) {
    fs.mkdirSync(moduleDir);
  }
  
  fs.writeFileSync(
    path.join(moduleDir, `${toolName}.mjs`),
    generatedCode
  );

  console.log(`Инструмент "${toolName}" добавлен!`);
  return true;
}

// --- Основная функция ---
async function main() {
  const userRequest = "создания 2D-персонажа с движением влево/вправо";

  console.log("Генерация инструмента для:", userRequest);
  const generatedCode = await generateTool(userRequest);
  console.log("Сгенерированный код:\n", generatedCode);

  await registerNewTool(
    "createCharacter",
    "Создает 2D-персонажа с управлением",
    generatedCode
  );

  const tools = loadTools();
  console.log("Доступные инструменты:", tools.tools.map(t => t.name));
}

// Запуск
main().catch(console.error);