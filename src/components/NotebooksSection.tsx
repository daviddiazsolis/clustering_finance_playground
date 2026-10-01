// SPDX-License-Identifier: Apache-2.0
import { motion } from 'motion/react'
import { BookOpen, ExternalLink } from 'lucide-react'
import { useLanguage } from '../context/LanguageContext'

const REPO = 'https://github.com/daviddiazsolis/clustering_finance_playground'
const NB = (f: string) => `https://colab.research.google.com/github/daviddiazsolis/clustering_finance_playground/blob/main/notebooks/${f}`
// Cada notebook existe en español (es) y en inglés (en); el botón abre el del idioma activo.
const NOTEBOOKS = [
  { k: 'nb1', es: 'Clustering_01_Segmentacion_de_Clientes.ipynb', en: 'Clustering_01_Segmentacion_de_Clientes_EN.ipynb' },
  { k: 'nb2', es: 'Clustering_02_Pair_Trading.ipynb', en: 'Clustering_02_Pair_Trading_EN.ipynb' },
  { k: 'nb3', es: 'Clustering_03_Perfilamiento_de_Inversionistas.ipynb', en: 'Clustering_03_Perfilamiento_de_Inversionistas_EN.ipynb' },
  { k: 'nb4', es: 'Clustering_04_Hierarchical_Risk_Parity.ipynb', en: 'Clustering_04_Hierarchical_Risk_Parity_EN.ipynb' },
]

export default function NotebooksSection() {
  const { t, language } = useLanguage()
  const other = language === 'es' ? 'en' : 'es'
  return (
    <section id="notebooks" className="py-16 px-6 max-w-7xl mx-auto border-t border-zinc-800/50 scroll-mt-16">
      <motion.div initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.4 }}>
        <h2 className="text-2xl font-bold text-zinc-100 mb-2 flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-amber-400" />
          {t('nbTitle')}
        </h2>
        <p className="text-zinc-400 text-sm mb-6">{t('nbSubtitle')}</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {NOTEBOOKS.map(nb => (
            <div key={nb.k} className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5 flex flex-col">
              <h3 className="font-semibold text-zinc-200 mb-2">{t(nb.k + 'Title')}</h3>
              <p className="text-sm text-zinc-500 mb-4 leading-relaxed flex-1">{t(nb.k + 'Desc')}</p>
              <div className="flex flex-wrap gap-2">
                <a href={NB(nb[language])} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-zinc-900 bg-amber-500 transition-opacity hover:opacity-80">
                  <ExternalLink className="w-3 h-3" /> {t('nbOpen')}
                </a>
                <a href={NB(nb[other])} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                  {t('nbOther')}
                </a>
                <a href={REPO} target="_blank" rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-zinc-700 text-xs text-zinc-400 hover:text-zinc-200 transition-colors">
                  GitHub
                </a>
              </div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  )
}
