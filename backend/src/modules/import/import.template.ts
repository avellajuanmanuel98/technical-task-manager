import ExcelJS from 'exceljs';

// Genera al vuelo una plantilla .xlsx de ejemplo — no se versiona un binario
// en el repo, se construye con la misma librería usada para parsear.
export async function buildTemplateBuffer(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Tareas');

  sheet.columns = [
    { header: 'ID de tarea', key: 'externalRef', width: 16 },
    { header: 'Descripción', key: 'description', width: 40 },
    { header: 'Técnico', key: 'technician', width: 24 },
    { header: 'Labor', key: 'labor', width: 24 },
    { header: 'Fecha', key: 'date', width: 14 },
    { header: 'Hora inicio', key: 'start', width: 14 },
    { header: 'Hora fin', key: 'end', width: 14 },
    { header: 'Estado', key: 'status', width: 16 },
    { header: 'Observaciones', key: 'observations', width: 30 },
  ];
  sheet.getRow(1).font = { bold: true };

  sheet.addRow({
    externalRef: 'Tarea #4859',
    description: 'Computador no enciende',
    technician: 'David Yesid Martinez',
    labor: 'Configuración de equipo',
    date: '2026-09-03',
    start: '10:06 AM',
    end: '10:20 AM',
    status: 'Finalizada',
    observations: 'Se reemplazó fuente de poder',
  });
  sheet.addRow({
    externalRef: 'Tarea #4860',
    description: 'Instalación de antivirus',
    technician: 'David Yesid Martinez',
    labor: 'Instalación de Apps',
    date: '2026-09-03',
    status: 'Pendiente',
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
