import type { LoaderContext } from 'webpack'
import { injectFilePath } from 'tangent-transform'

export default function tangentLoader(this: LoaderContext<{}>, source: string): string {
  const filePath = this.resourcePath
  const result = injectFilePath(source, filePath)
  return result ?? source
}
