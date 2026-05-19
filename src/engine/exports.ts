import ExcelJS from 'exceljs';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { supabase } from '../lib/supabase';

interface ExportData {
  planningId: string;
  mois: number;
  annee: number;
}

const CRENEAU_SHORT: Record<string, string> = {
  AM_MENA: 'AM',
  APM: 'APM',
  NUIT: 'NUIT',
  WE: 'WE',
};

const JOURS_SEMAINE = ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'];

async function loadExportData(params: ExportData) {
  const [{ data: affectations }, { data: intervenants }] = await Promise.all([
    supabase.from('affectations').select('*').eq('planning_id', params.planningId),
    supabase.from('intervenants').select('*'),
  ]);

  const intervMap: Record<string, string> = {};
  for (const i of intervenants ?? []) {
    intervMap[i.id] = i.prenom;
  }

  const daysInMonth = new Date(params.annee, params.mois, 0).getDate();
  const days: { num: number; label: string }[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(params.annee, params.mois - 1, d);
    days.push({ num: d, label: JOURS_SEMAINE[date.getDay()] });
  }

  // Construire la grille : creneau x jour -> prenom
  const creneaux = ['AM_MENA', 'APM', 'NUIT', 'WE'];
  const grid: Record<string, Record<number, string>> = {};
  for (const code of creneaux) {
    grid[code] = {};
  }

  for (const a of affectations ?? []) {
    const day = new Date((a as any).date).getDate();
    const code = (a as any).creneau_code;
    grid[code][day] = intervMap[(a as any).intervenant_id] ?? '?';
  }

  return { days, creneaux, grid, intervMap, daysInMonth };
}

function getMoisLabel(mois: number, annee: number): string {
  return new Date(annee, mois - 1).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

export async function exportExcel(params: ExportData): Promise<void> {
  const { days, creneaux, grid, daysInMonth } = await loadExportData(params);
  const titre = `Planning ${getMoisLabel(params.mois, params.annee)}`;

  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(titre);

  // En-tete
  const headers = ['Creneau', ...days.map(d => `${d.num}\n${d.label}`)];
  const headerRow = sheet.addRow(headers);
  headerRow.font = { bold: true, size: 9 };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };

  // Largeur des colonnes
  sheet.getColumn(1).width = 12;
  for (let i = 2; i <= daysInMonth + 1; i++) {
    sheet.getColumn(i).width = 8;
  }

  // Couleurs par creneau
  const colors: Record<string, string> = {
    AM_MENA: 'FFF59E0B',
    APM: 'FF3B82F6',
    NUIT: 'FF6366F1',
    WE: 'FF10B981',
  };

  // Lignes par creneau
  for (const code of creneaux) {
    const row = [CRENEAU_SHORT[code]];
    for (const d of days) {
      row.push(grid[code][d.num] ?? '');
    }
    const dataRow = sheet.addRow(row);
    dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
    dataRow.font = { size: 9 };

    // Colorer la premiere cellule
    dataRow.getCell(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: colors[code] ?? 'FFE5E7EB' },
    };
    dataRow.getCell(1).font = { bold: true, size: 9, color: { argb: 'FFFFFFFF' } };
  }

  // Telecharger
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `planning_${params.annee}_${String(params.mois).padStart(2, '0')}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}

export async function exportPDF(params: ExportData): Promise<void> {
  const { days, creneaux, grid } = await loadExportData(params);
  const titre = `Planning ${getMoisLabel(params.mois, params.annee)}`;

  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });

  doc.setFontSize(16);
  doc.text(titre, 14, 15);

  const headers = ['Creneau', ...days.map(d => `${d.num}`)];
  const body = creneaux.map(code => [
    CRENEAU_SHORT[code],
    ...days.map(d => grid[code][d.num] ?? ''),
  ]);

  autoTable(doc, {
    head: [headers],
    body,
    startY: 22,
    theme: 'grid',
    styles: {
      fontSize: 6,
      cellPadding: 1,
      halign: 'center',
    },
    headStyles: {
      fillColor: [59, 130, 246],
      fontSize: 6,
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 15 },
    },
  });

  doc.save(`planning_${params.annee}_${String(params.mois).padStart(2, '0')}.pdf`);
}
