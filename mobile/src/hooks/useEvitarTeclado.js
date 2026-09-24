import { useEffect, useRef, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// Substitui o KeyboardAvoidingView no Android. Com edge-to-edge (padrão do
// SDK 56) a janela não encolhe com o teclado, e o KeyboardAvoidingView erra
// por mais ou menos a altura da barra de gestos, deixando o campo de texto
// cortado. Aqui medimos onde o container realmente termina na janela e onde
// o teclado começa, e o `paddingBottom` devolvido cobre exatamente a
// diferença — se a janela já tiver encolhido, a diferença é 0.
//
// Uso: <View ref={ref} style={{ flex: 1, paddingBottom: sobreposicao }}>
export function useEvitarTeclado() {
  const ref = useRef(null);
  const [sobreposicao, setSobreposicao] = useState(0);
  const [tecladoVisivel, setTecladoVisivel] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'android') return undefined;

    const medir = (e) => {
      setTecladoVisivel(true);
      ref.current?.measureInWindow((_x, y, _w, altura) => {
        setSobreposicao(Math.max(0, Math.round(y + altura - e.endCoordinates.screenY)));
      });
    };

    const mostrar = Keyboard.addListener('keyboardDidShow', medir);
    // Ex: a barra de sugestões do Gboard só aparece após a primeira letra
    // digitada, mudando a altura do teclado sem um novo "show" — sem isso o
    // padding medido no show fica desatualizado bem quando o usuário digita.
    const mudaFrame = Keyboard.addListener('keyboardDidChangeFrame', medir);
    const esconder = Keyboard.addListener('keyboardDidHide', () => {
      setTecladoVisivel(false);
      setSobreposicao(0);
    });

    return () => {
      mostrar.remove();
      mudaFrame.remove();
      esconder.remove();
    };
  }, []);

  return { ref, sobreposicao, tecladoVisivel };
}
