"""
Telegram Bot for Alexei Docs — invoice generation.

Uses aiogram 3.x. Supports both:
1. Mini App mode (HTTPS required) — opens web form in Telegram
2. Chat mode — step-by-step form filling directly in chat
"""

import os
import json
import logging
import asyncio

import aiohttp
from aiogram import Bot, Dispatcher, Router, F
from aiogram.filters import CommandStart, StateFilter
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.types import (
    Message,
    InlineKeyboardMarkup,
    InlineKeyboardButton,
    WebAppInfo,
    CallbackQuery,
    BufferedInputFile,
)
from aiogram.enums import ParseMode

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

BOT_TOKEN = os.environ["BOT_TOKEN"]
WEBAPP_URL = os.environ.get("WEBAPP_URL", "http://45.13.237.33:3000")
API_URL = os.environ.get("WEBAPP_INTERNAL_URL", WEBAPP_URL)

bot = Bot(token=BOT_TOKEN, parse_mode=ParseMode.HTML)
dp = Dispatcher()
router = Router()


# === FSM States for chat-based invoice creation ===
class InvoiceForm(StatesGroup):
    choosing_template = State()
    filling_fields = State()
    confirming = State()


# === Keyboards ===
def main_keyboard() -> InlineKeyboardMarkup:
    buttons = []
    if WEBAPP_URL.startswith("https://"):
        buttons.append([InlineKeyboardButton(
            text="Создать инвойс (Mini App)",
            web_app=WebAppInfo(url=f"{WEBAPP_URL}/telegram"),
        )])
    buttons.append([InlineKeyboardButton(
        text="Создать инвойс",
        callback_data="create_invoice",
    )])
    buttons.append([InlineKeyboardButton(
        text="Открыть сайт",
        url=WEBAPP_URL,
    )])
    return InlineKeyboardMarkup(inline_keyboard=buttons)


async def fetch_templates():
    """Fetch available templates from the Next.js API."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.get(f"{API_URL}/api/templates") as resp:
                if resp.status == 200:
                    data = await resp.json()
                    return [t for t in data if t.get("placeholders")]
    except Exception as e:
        logger.error(f"Failed to fetch templates: {e}")
    return []


async def generate_pdf(file_path: str, field_values: dict) -> bytes | None:
    """Call the API to generate a filled PDF."""
    try:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                f"{API_URL}/api/telegram/generate",
                json={"filePath": file_path, "fieldValues": field_values},
                timeout=aiohttp.ClientTimeout(total=30),
            ) as resp:
                if resp.status == 200:
                    return await resp.read()
                else:
                    error = await resp.text()
                    logger.error(f"PDF generation failed: {error}")
    except Exception as e:
        logger.error(f"PDF generation error: {e}")
    return None


# === Handlers ===
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    await message.answer(
        "<b>Alexei Docs — генератор документов</b>\n\n"
        "Создавайте инвойсы и документы прямо в Telegram!\n\n"
        "Нажмите <b>«Создать инвойс»</b> для начала.",
        reply_markup=main_keyboard(),
    )


@router.callback_query(F.data == "create_invoice")
async def start_invoice(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    templates = await fetch_templates()

    if not templates:
        await callback.message.answer(
            "Нет доступных шаблонов. Сначала загрузите шаблон через сайт."
        )
        return

    # Show template selection
    buttons = []
    for i, t in enumerate(templates):
        buttons.append([InlineKeyboardButton(
            text=f"{t['name']} ({len(t.get('placeholders', []))} полей)",
            callback_data=f"tmpl_{i}",
        )])
    buttons.append([InlineKeyboardButton(text="Отмена", callback_data="cancel")])

    await state.update_data(templates=templates)
    await state.set_state(InvoiceForm.choosing_template)

    await callback.message.edit_text(
        "<b>Выберите шаблон:</b>",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=buttons),
    )


@router.callback_query(F.data == "cancel")
async def cancel_flow(callback: CallbackQuery, state: FSMContext):
    await callback.answer("Отменено")
    await state.clear()
    await callback.message.edit_text(
        "Создание отменено. Нажмите /start чтобы начать заново."
    )


@router.callback_query(InvoiceForm.choosing_template, F.data.startswith("tmpl_"))
async def template_selected(callback: CallbackQuery, state: FSMContext):
    await callback.answer()
    idx = int(callback.data.split("_")[1])
    data = await state.get_data()
    templates = data.get("templates", [])

    if idx >= len(templates):
        await callback.message.answer("Шаблон не найден. Попробуйте /start")
        return

    template = templates[idx]
    placeholders = template.get("placeholders", [])

    await state.update_data(
        selected_template=template,
        placeholders=placeholders,
        field_values={},
        current_field_idx=0,
    )
    await state.set_state(InvoiceForm.filling_fields)

    # Ask for the first field
    await ask_next_field(callback.message, state)


async def ask_next_field(message: Message, state: FSMContext):
    """Ask the user for the next field value."""
    data = await state.get_data()
    placeholders = data["placeholders"]
    idx = data["current_field_idx"]

    if idx >= len(placeholders):
        # All fields filled — show confirmation
        await show_confirmation(message, state)
        return

    p = placeholders[idx]
    field_type = p.get("fieldType", "TEXT")
    required = "обязательное" if p.get("required") else "необязательное"

    hint = ""
    if field_type == "DATE":
        hint = "\n(формат: ДД.ММ.ГГГГ)"
    elif field_type == "NUMBER":
        hint = "\n(введите число)"
    elif field_type == "PHONE":
        hint = "\n(формат: +7...)"

    skip_btn = []
    if not p.get("required"):
        skip_btn = [[InlineKeyboardButton(text="Пропустить", callback_data="skip_field")]]

    await message.answer(
        f"<b>Поле {idx + 1}/{len(placeholders)}</b>\n\n"
        f"{p.get('label', p['key'])} ({required}){hint}",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            *skip_btn,
            [InlineKeyboardButton(text="Отмена", callback_data="cancel")],
        ]) if skip_btn or True else None,
    )


@router.callback_query(InvoiceForm.filling_fields, F.data == "skip_field")
async def skip_field(callback: CallbackQuery, state: FSMContext):
    await callback.answer("Пропущено")
    data = await state.get_data()
    await state.update_data(current_field_idx=data["current_field_idx"] + 1)
    await ask_next_field(callback.message, state)


@router.message(InvoiceForm.filling_fields)
async def receive_field_value(message: Message, state: FSMContext):
    """Receive a field value from the user."""
    data = await state.get_data()
    placeholders = data["placeholders"]
    idx = data["current_field_idx"]

    if idx >= len(placeholders):
        return

    p = placeholders[idx]
    value = message.text.strip()

    # Basic validation
    if p.get("required") and not value:
        await message.answer("Это поле обязательное. Введите значение:")
        return

    # Save value
    field_values = data.get("field_values", {})
    field_values[p["key"]] = value

    await state.update_data(
        field_values=field_values,
        current_field_idx=idx + 1,
    )

    await ask_next_field(message, state)


async def show_confirmation(message: Message, state: FSMContext):
    """Show filled values and ask for confirmation."""
    data = await state.get_data()
    template = data["selected_template"]
    placeholders = data["placeholders"]
    field_values = data["field_values"]

    # Build preview
    lines = [f"<b>Шаблон:</b> {template['name']}\n"]
    for p in placeholders:
        value = field_values.get(p["key"], "—")
        lines.append(f"  {p.get('label', p['key'])}: <b>{value}</b>")

    await state.set_state(InvoiceForm.confirming)
    await message.answer(
        "<b>Проверьте данные:</b>\n\n" + "\n".join(lines),
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [
                InlineKeyboardButton(text="Сгенерировать PDF", callback_data="confirm_generate"),
                InlineKeyboardButton(text="Отмена", callback_data="cancel"),
            ],
        ]),
    )


@router.callback_query(InvoiceForm.confirming, F.data == "confirm_generate")
async def confirm_and_generate(callback: CallbackQuery, state: FSMContext):
    await callback.answer("Генерирую PDF...")
    data = await state.get_data()
    template = data["selected_template"]
    field_values = data["field_values"]

    await callback.message.edit_text("Генерирую PDF, подождите...")

    pdf_bytes = await generate_pdf(template["filePath"], field_values)

    if pdf_bytes:
        input_file = BufferedInputFile(
            pdf_bytes,
            filename=f"{template['name']}.pdf",
        )
        await callback.message.answer_document(
            input_file,
            caption=f"Ваш документ <b>{template['name']}</b> готов!",
        )
        await callback.message.answer(
            "Хотите создать ещё один документ?",
            reply_markup=main_keyboard(),
        )
    else:
        await callback.message.answer(
            "Ошибка при генерации PDF. Попробуйте снова.",
            reply_markup=main_keyboard(),
        )

    await state.clear()


# === Mini App data handler ===
@router.message(F.web_app_data)
async def handle_webapp_data(message: Message):
    try:
        data = json.loads(message.web_app_data.data)
        logger.info(f"Received webapp data: {json.dumps(data, ensure_ascii=False)[:200]}")

        for template in data.get("templates", []):
            file_path = template.get("filePath")
            field_values = data.get("fieldValues", {})
            if not file_path:
                continue

            pdf_bytes = await generate_pdf(file_path, field_values)
            if pdf_bytes:
                doc_name = template.get("name", "invoice")
                input_file = BufferedInputFile(pdf_bytes, filename=f"{doc_name}.pdf")
                await message.answer_document(
                    input_file,
                    caption=f"Ваш документ <b>{doc_name}</b> готов!",
                )
            else:
                await message.answer("Ошибка при генерации PDF. Попробуйте снова.")

        await message.answer("Хотите создать ещё?", reply_markup=main_keyboard())

    except Exception as e:
        logger.error(f"Error handling webapp data: {e}", exc_info=True)
        await message.answer("Произошла ошибка. Попробуйте снова.")


@router.message(F.text.lower().in_({"инвойс", "создать", "новый"}))
async def handle_keywords(message: Message):
    await message.answer("Откройте форму:", reply_markup=main_keyboard())


@router.message()
async def handle_any(message: Message):
    await message.answer(
        "Используйте кнопки ниже:",
        reply_markup=main_keyboard(),
    )


dp.include_router(router)


async def main():
    logger.info("Starting Alexei Docs Bot...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
