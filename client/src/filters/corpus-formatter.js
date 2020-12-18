import CorpusUtil from '@/utils/corpus-util';

export default function (value) {
  return CorpusUtil.CORPUS_MAP[value] || value;
}
