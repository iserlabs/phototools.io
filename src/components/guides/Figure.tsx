import 'server-only'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import Image from 'next/image'
import { imageSize } from 'image-size'
import styles from './Figure.module.css'

interface FigureProps {
  src: string
  alt: string
  caption?: string
}

export function Figure({ src, alt, caption }: FigureProps) {
  const buffer = readFileSync(path.join(process.cwd(), 'public', src))
  const { width, height } = imageSize(buffer)
  return (
    <figure className={styles.figure}>
      <Image
        src={src}
        alt={alt}
        width={width}
        height={height}
        loading="lazy"
        sizes="(max-width: 1023px) 100vw, 720px"
        className={styles.image}
      />
      {caption && <figcaption className={styles.caption}>{caption}</figcaption>}
    </figure>
  )
}
