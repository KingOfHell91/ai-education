const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { randomUUID } = require('crypto');
const pdfParse = require('pdf-parse');
const {
  createAbiTask,
  getAbiTaskById,
  getRandomAbiTask,
  listAbiTasks
} = require('../db');

const router = express.Router();

const PDF_MIME_TYPES = ['application/pdf'];
const UPLOAD_DIR = path.join(__dirname, '..', 'uploads', 'abi');

fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname) || '.pdf';
    cb(null, `${randomUUID()}${ext.toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (!PDF_MIME_TYPES.includes(file.mimetype)) {
      cb(new Error('Nur PDF-Dateien sind erlaubt.'));
      return;
    }
    cb(null, true);
  }
});

function normalizeTask(task, req) {
  if (!task) return null;
  const baseUrl = `${req.protocol}://${req.get('host')}`;
  return {
    ...task,
    pdfUrl: `${baseUrl}/api/abi-tasks/${task.id}/pdf`
  };
}

async function enrichTaskWithPdfData(task, options = {}) {
  const { includePdfBase64 = false, includePdfText = false } = options;
  if (!task || (!includePdfBase64 && !includePdfText)) {
    return task;
  }

  const absolutePath = path.join(__dirname, '..', task.pdf_path);
  try {
    const fileBuffer = await fs.promises.readFile(absolutePath);
    const enriched = {
      ...task,
      pdfBase64: includePdfBase64
        ? `data:application/pdf;base64,${fileBuffer.toString('base64')}`
        : task.pdfBase64
    };
    if (includePdfText) {
      try {
        const parsed = await pdfParse(fileBuffer);
        enriched.pdfText = parsed.text;
        enriched.pdfPageCount = parsed.numpages;
      } catch (parseError) {
        console.warn('[abiTasks] Failed to extract text from PDF:', parseError);
      }
    }
    return enriched;
  } catch (error) {
    console.error('[abiTasks] Failed to read PDF for enrichment:', error);
    return task;
  }
}

router.post('/', upload.single('pdf'), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: 'Eine PDF-Datei ist erforderlich.' });
      return;
    }

    const {
      title,
      year,
      subject,
      tags,
      metadata
    } = req.body;

    const taskId = randomUUID();
    const relativePdfPath = path.relative(
      path.join(__dirname, '..'),
      req.file.path
    );

    const tagList = typeof tags === 'string' && tags.length > 0
      ? tags.split(',').map((tag) => tag.trim()).filter(Boolean)
      : [];

    let parsedMetadata = null;
    if (metadata) {
      try {
        parsedMetadata = JSON.parse(metadata);
      } catch (err) {
        console.warn('[abiTasks] Invalid metadata JSON, ignoring', err);
      }
    }

    const created = await createAbiTask({
      id: taskId,
      title: title || null,
      year: year ? Number.parseInt(year, 10) : null,
      subject: subject || null,
      tags: tagList,
      pdfPath: relativePdfPath.replace(/\\/g, '/'),
      originalFilename: req.file.originalname,
      metadata: parsedMetadata
    });

    res.status(201).json(normalizeTask(created, req));
  } catch (error) {
    next(error);
  }
});

router.get('/random', async (req, res, next) => {
  try {
    const task = await getRandomAbiTask();
    if (!task) {
      res.status(404).json({ error: 'Keine Abitur-Aufgaben vorhanden.' });
      return;
    }
    const includePdfBase64 = req.query.includePdfBase64 === 'true';
    const includePdfText = req.query.includePdfText === 'true';
    const normalized = normalizeTask(task, req);
    const enriched = await enrichTaskWithPdfData(normalized, { includePdfBase64, includePdfText });
    res.json(enriched);
  } catch (error) {
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const tasks = await listAbiTasks();
    res.json(tasks.map((task) => normalizeTask(task, req)));
  } catch (error) {
    next(error);
  }
});

router.get('/:id/pdf', async (req, res, next) => {
  try {
    const task = await getAbiTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Aufgabe nicht gefunden.' });
      return;
    }

    const absolutePath = path.join(__dirname, '..', task.pdf_path);
    if (!fs.existsSync(absolutePath)) {
      res.status(410).json({ error: 'PDF-Datei wurde entfernt oder verschoben.' });
      return;
    }

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="${encodeURIComponent(task.original_filename || 'abi-aufgabe.pdf')}"`
    );
    res.sendFile(absolutePath);
  } catch (error) {
    next(error);
  }
});

router.get('/:id/pdf/base64', async (req, res, next) => {
  try {
    const task = await getAbiTaskById(req.params.id);
    if (!task) {
      res.status(404).json({ error: 'Aufgabe nicht gefunden.' });
      return;
    }

    const absolutePath = path.join(__dirname, '..', task.pdf_path);
    if (!fs.existsSync(absolutePath)) {
      res.status(410).json({ error: 'PDF-Datei wurde entfernt oder verschoben.' });
      return;
    }

    const includeText = req.query.includeText === 'true';
    const fileBuffer = await fs.promises.readFile(absolutePath);
    const responsePayload = {
      id: task.id,
      pdfBase64: `data:application/pdf;base64,${fileBuffer.toString('base64')}`
    };

    if (includeText) {
      try {
        const parsed = await pdfParse(fileBuffer);
        responsePayload.pdfText = parsed.text;
        responsePayload.pdfPageCount = parsed.numpages;
      } catch (parseError) {
        console.warn('[abiTasks] Failed to extract text for single PDF request:', parseError);
      }
    }

    res.json(responsePayload);
  } catch (error) {
    next(error);
  }
});

module.exports = router;

