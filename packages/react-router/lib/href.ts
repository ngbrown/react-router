import type { Pages } from "./types/register";
import type { Equal } from "./types/utils";

type Args = { [K in keyof Pages]: ToArgs<Pages[K]["params"]> };

// prettier-ignore
type ToArgs<Params extends Record<string, string | undefined>> =
  // path without params -> no `params` arg
  Equal<Params, {}> extends true ? [] :
  // path with only optional params -> optional `params` arg
  Partial<Params> extends Params ? [Params] | [] :
  // otherwise, require `params` arg
  [Params];

/**
  Returns a resolved URL path for the specified route.

  ```tsx
  const h = href("/:lang?/about", { lang: "en" })
  // -> `/en/about`

  <Link to={href("/products/:id", { id: "abc123" })} />
  ```
 */
export function href<Path extends keyof Args>(
  path: Path,
  ...args: Args[Path]
): string {
  let params = args[0];
  let result = trimEndSplat(path) // Ignore trailing / and /*, we'll handle it below
    .replace(
      /\/:([\w-]+)(\?)?/g, // same regex as in .\router\utils.ts: compilePath().
      (_: string, param: string, isOptional) => {
        const value = params ? params[param] : undefined;
        if (isOptional == null && value == null) {
          throw new Error(
            `Path '${path}' requires param '${param}' but it was not provided`,
          );
        }
        return value == null ? "" : "/" + value;
      },
    );

  if (path.endsWith("*")) {
    // treat trailing splat the same way as compilePath, and force it to be as if it were `/*`.
    // `react-router typegen` will not generate the params for a malformed splat, causing a type error, but we can still do the correct thing here.
    if (params && params["*"] != null) {
      result += "/" + params["*"];
    }
  }

  return result || "/";
}

/**
  Removes a trailing splat and any number of slashes from the end of the path.

  Benchmarks as running faster than `path.replace(/\/*\*?$/, "")`, which backtracks, and sometimes faster than the split/join approach.
  
  just this function (16x to 40x speed of regex):
  https://jsbenchmark.com/#eyJjYXNlcyI6W3siaWQiOiJoM2NSc2pHaHB3UEZvVlJJVjV5b0wiLCJjb2RlIjoiREFUQS50cmltRW5kU3BsYXQxKERBVEEucGF0aEEpIiwibmFtZSI6IiIsImRlcGVuZGVuY2llcyI6W119LHsiaWQiOiJEX0hab2MxSGxFQVljekR4bjlmLXgiLCJjb2RlIjoiREFUQS50cmltRW5kU3BsYXQxKERBVEEucGF0aEIpIiwibmFtZSI6IiIsImRlcGVuZGVuY2llcyI6W119LHsiaWQiOiJOTWRYalVicHhyY19QbjlHU25fYlkiLCJjb2RlIjoiREFUQS50cmltRW5kU3BsYXQxKERBVEEucGF0aEMpIiwibmFtZSI6IiIsImRlcGVuZGVuY2llcyI6W119LHsiaWQiOiJuY1IyTkVsekxKNGN6R08zb2tlUFciLCJjb2RlIjoiREFUQS50cmltRW5kU3BsYXQyKERBVEEucGF0aEEpIiwiZGVwZW5kZW5jaWVzIjpbXX0seyJpZCI6IlBxeXRDSUpPVUJsYXM5azVwYkFzRyIsImNvZGUiOiJEQVRBLnRyaW1FbmRTcGxhdDIoREFUQS5wYXRoQikiLCJkZXBlbmRlbmNpZXMiOltdfSx7ImlkIjoiclNlQ3d3SzdDczZ1bGpoZE13VDE0IiwiY29kZSI6IkRBVEEudHJpbUVuZFNwbGF0MihEQVRBLnBhdGhDKSIsImRlcGVuZGVuY2llcyI6W119XSwiY29uZmlnIjp7Im5hbWUiOiJCYXNpYyBleGFtcGxlIiwicGFyYWxsZWwiOnRydWUsImdsb2JhbFRlc3RDb25maWciOnsiZGVwZW5kZW5jaWVzIjpbXX0sImRhdGFDb2RlIjoiZnVuY3Rpb24gdHJpbUVuZFNwbGF0MShwYXRoKSB7XG4gIHJldHVybiBwYXRoLnJlcGxhY2UoL1xcLypcXCo_JC8sIFwiXCIpO1xufVxuXG5mdW5jdGlvbiB0cmltRW5kU3BsYXQyKHBhdGgpIHtcbiAgbGV0IGkgPSBwYXRoLmxlbmd0aCAtIDE7XG4gIGxldCBjaGFyID0gcGF0aFtpXTtcbiAgaWYgKGNoYXIgIT09IFwiKlwiICYmIGNoYXIgIT09IFwiL1wiKSB7XG4gICAgcmV0dXJuIHBhdGg7XG4gIH1cbiAgaS0tO1xuICBmb3IgKDsgaSA-PSAwOyBpLS0pIHtcbiAgICAvLyBmb3IvYnJlYWsgYmVuY2htYXJrcyBmYXN0ZXIgdGhhbiBkby93aGlsZVxuICAgIGlmIChwYXRoW2ldICE9PSBcIi9cIikge1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiBwYXRoLnNsaWNlKDAsIGkgKyAxKTtcbn1cblxucmV0dXJuIERBVEEgPSB7XG4gIHRyaW1FbmRTcGxhdDEsXG4gIHRyaW1FbmRTcGxhdDIsXG4gIHBhdGhBOiBcIi95aXJlbGJtcGNuLypcIixcbiAgcGF0aEI6IFwiL3hrZnFzb2lkdWMvXCIsXG4gIHBhdGhDOiBcIi90cHBuaHRod2VsL3ZtcWpjYmVjbGRcIixcbn0ifX0

  href options (0.9x to 3x speed of original):
  https://jsbenchmark.com/#eyJjYXNlcyI6W3siaWQiOiJReExCWUJVN3d3SjN5Yi1RVFRYdTQiLCJjb2RlIjoiREFUQS5ocmVmMShcIi9hLzpiPy86Yi86Yj8vOmJcIiwgeyBiOiBcImhlbGxvXCIgfSkiLCJkZXBlbmRlbmNpZXMiOltdLCJuYW1lIjoiaHJlZjFsb25nIn0seyJpZCI6IjAzWHJuRjhDMnA2Um5XTHBTRmdMLSIsImNvZGUiOiJEQVRBLmhyZWYxKFwiL2EvOmJcIiwgeyBiOiBcImhlbGxvXCIgfSkiLCJkZXBlbmRlbmNpZXMiOltdLCJuYW1lIjoiaHJlZjFzaG9ydCJ9LHsiaWQiOiIwcGV5WU9raGJrd05SYlAzLXpIYUsiLCJjb2RlIjoiREFUQS5ocmVmMShcIi9hLypcIiwgeyBcIipcIjogXCJiL2NcIiB9KSIsImRlcGVuZGVuY2llcyI6W10sIm5hbWUiOiJocmVmMXNwbGF0In0seyJpZCI6IkhaTHFxS20zMDFnOTNiaEpYMW5tMyIsImNvZGUiOiJEQVRBLmhyZWYyKFwiL2EvOmI_LzpiLzpiPy86YlwiLCB7IGI6IFwiaGVsbG9cIiB9KSIsImRlcGVuZGVuY2llcyI6W10sIm5hbWUiOiJocmVmMmxvbmcifSx7ImlkIjoiRlJ5clZFamx4dmxWaVdZcThpdnFuIiwiY29kZSI6IkRBVEEuaHJlZjIoXCIvYS86YlwiLCB7IGI6IFwiaGVsbG9cIiB9KSIsImRlcGVuZGVuY2llcyI6W10sIm5hbWUiOiJocmVmMnNob3J0In0seyJpZCI6Ingzd1NkZ2FFc01GYVczRGhnWGo0QyIsImNvZGUiOiJEQVRBLmhyZWYyKFwiL2EvKlwiLCB7IFwiKlwiOiBcImIvY1wiIH0pIiwiZGVwZW5kZW5jaWVzIjpbXSwibmFtZSI6ImhyZWYyc3BsYXQifSx7ImlkIjoielI0YzRXc2prbG03Yk8wZzRJQWk1IiwiY29kZSI6IkRBVEEuaHJlZjMoXCIvYS86Yj8vOmIvOmI_LzpiXCIsIHsgYjogXCJoZWxsb1wiIH0pIiwiZGVwZW5kZW5jaWVzIjpbXSwibmFtZSI6ImhyZWYzbG9uZyJ9LHsiaWQiOiItajJ1dDB2UVlHb05HSnliamo4NDkiLCJjb2RlIjoiREFUQS5ocmVmMyhcIi9hLzpiXCIsIHsgYjogXCJoZWxsb1wiIH0pIiwiZGVwZW5kZW5jaWVzIjpbXSwibmFtZSI6ImhyZWYzc2hvcnQifSx7ImlkIjoiR0hnaUg5WF9sdlEzUlJHbmtyalg0IiwiY29kZSI6IkRBVEEuaHJlZjMoXCIvYS8qXCIsIHsgXCIqXCI6IFwiYi9jXCIgfSkiLCJkZXBlbmRlbmNpZXMiOltdLCJuYW1lIjoiaHJlZjNzcGxhdCJ9XSwiY29uZmlnIjp7Im5hbWUiOiIiLCJwYXJhbGxlbCI6ZmFsc2UsImRhdGFDb2RlIjoiZnVuY3Rpb24gaHJlZjEocGF0aCwgLi4uYXJncykge1xuICAgIGxldCBwYXJhbXMgPSBhcmdzWzBdO1xuICAgIHJldHVybiBwYXRoXG4gICAgICAgIC5zcGxpdChcIi9cIilcbiAgICAgICAgLm1hcCgoc2VnbWVudCkgPT4ge1xuICAgICAgICBpZiAoc2VnbWVudCA9PT0gXCIqXCIpIHtcbiAgICAgICAgICAgIHJldHVybiBwYXJhbXMgPyBwYXJhbXNbXCIqXCJdIDogdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgICAgIGNvbnN0IG1hdGNoID0gc2VnbWVudC5tYXRjaCgvXjooW1xcdy1dKykoXFw_KT8vKTtcbiAgICAgICAgaWYgKCFtYXRjaClcbiAgICAgICAgICAgIHJldHVybiBzZWdtZW50O1xuICAgICAgICBjb25zdCBwYXJhbSA9IG1hdGNoWzFdO1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcmFtcyA_IHBhcmFtc1twYXJhbV0gOiB1bmRlZmluZWQ7XG4gICAgICAgIGNvbnN0IGlzUmVxdWlyZWQgPSBtYXRjaFsyXSA9PT0gdW5kZWZpbmVkO1xuICAgICAgICBpZiAoaXNSZXF1aXJlZCAmJiB2YWx1ZSA9PT0gdW5kZWZpbmVkKSB7XG4gICAgICAgICAgICB0aHJvdyBFcnJvcihgUGF0aCAnJHtwYXRofScgcmVxdWlyZXMgcGFyYW0gJyR7cGFyYW19JyBidXQgaXQgd2FzIG5vdCBwcm92aWRlZGApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9KVxuICAgICAgICAuZmlsdGVyKChzZWdtZW50KSA9PiBzZWdtZW50ICE9PSB1bmRlZmluZWQpXG4gICAgICAgIC5qb2luKFwiL1wiKTtcbn1cbmNvbnN0IHJlZ2V4MSA9IC9cXC8qXFwqPyQvO1xuY29uc3QgcmVnZXgyID0gL1xcLzooW1xcdy1dKykoXFw_KT8vZztcbmZ1bmN0aW9uIGhyZWYyKHBhdGgsIC4uLmFyZ3MpIHtcbiAgICBsZXQgcGFyYW1zID0gYXJnc1swXTtcbiAgICBsZXQgcmVzdWx0ID0gcGF0aFxuICAgICAgICAucmVwbGFjZShyZWdleDEsIFwiXCIpIC8vIElnbm9yZSB0cmFpbGluZyAvIGFuZCAvKiwgd2UnbGwgaGFuZGxlIGl0IGJlbG93XG4gICAgICAgIC5yZXBsYWNlKHJlZ2V4MiwgLy8gc2FtZSByZWdleCBhcyBpbiAuXFxyb3V0ZXJcXHV0aWxzLnRzOiBjb21waWxlUGF0aCgpLlxuICAgIChfLCBwYXJhbSwgaXNPcHRpb25hbCkgPT4ge1xuICAgICAgICBjb25zdCB2YWx1ZSA9IHBhcmFtcyA_IHBhcmFtc1twYXJhbV0gOiB1bmRlZmluZWQ7XG4gICAgICAgIGlmIChpc09wdGlvbmFsID09IG51bGwgJiYgdmFsdWUgPT0gbnVsbCkge1xuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKGBQYXRoICcke3BhdGh9JyByZXF1aXJlcyBwYXJhbSAnJHtwYXJhbX0nIGJ1dCBpdCB3YXMgbm90IHByb3ZpZGVkYCk7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHZhbHVlID09IG51bGwgPyBcIlwiIDogXCIvXCIgKyB2YWx1ZTtcbiAgICB9KTtcbiAgICBpZiAocGF0aC5lbmRzV2l0aChcIipcIikpIHtcbiAgICAgICAgLy8gdHJlYXQgdHJhaWxpbmcgc3BsYXQgdGhlIHNhbWUgd2F5IGFzIGNvbXBpbGVQYXRoLCBhbmQgZm9yY2UgaXQgdG8gYmUgYXMgaWYgaXQgd2VyZSBgLypgLlxuICAgICAgICAvLyBgcmVhY3Qtcm91dGVyIHR5cGVnZW5gIHdpbGwgbm90IGdlbmVyYXRlIHRoZSBwYXJhbXMgZm9yIGEgbWFsZm9ybWVkIHNwbGF0LCBjYXVzaW5nIGEgdHlwZSBlcnJvciwgYnV0IHdlIGNhbiBzdGlsbCBkbyB0aGUgY29ycmVjdCB0aGluZyBoZXJlLlxuICAgICAgICBpZiAocGFyYW1zICYmIHBhcmFtc1tcIipcIl0gIT0gbnVsbCkge1xuICAgICAgICAgICAgcmVzdWx0ICs9IFwiL1wiICsgcGFyYW1zW1wiKlwiXTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gcmVzdWx0IHx8IFwiL1wiO1xufVxuXG5mdW5jdGlvbiB0cmltRW5kU3BsYXQocGF0aCkge1xuICBsZXQgaSA9IHBhdGgubGVuZ3RoIC0gMTtcbiAgbGV0IGNoYXIgPSBwYXRoW2ldO1xuICBpZiAoY2hhciAhPT0gXCIqXCIgJiYgY2hhciAhPT0gXCIvXCIpIHtcbiAgICByZXR1cm4gcGF0aDtcbiAgfVxuICBpLS07XG4gIGZvciAoOyBpID49IDA7IGktLSkge1xuICAgIC8vIGZvci9icmVhayBiZW5jaG1hcmtzIGZhc3RlciB0aGFuIGRvL3doaWxlXG4gICAgaWYgKHBhdGhbaV0gIT09IFwiL1wiKSB7XG4gICAgICBicmVhaztcbiAgICB9XG4gIH1cbiAgcmV0dXJuIHBhdGguc2xpY2UoMCwgaSArIDEpO1xufVxuXG5mdW5jdGlvbiBocmVmMyhwYXRoLCAuLi5hcmdzKSB7XG4gICAgbGV0IHBhcmFtcyA9IGFyZ3NbMF07XG4gICAgbGV0IHJlc3VsdCA9IHRyaW1FbmRTcGxhdChwYXRoKSAvLyBJZ25vcmUgdHJhaWxpbmcgLyBhbmQgLyosIHdlJ2xsIGhhbmRsZSBpdCBiZWxvd1xuICAgICAgICAucmVwbGFjZShyZWdleDIsIC8vIHNhbWUgcmVnZXggYXMgaW4gLlxccm91dGVyXFx1dGlscy50czogY29tcGlsZVBhdGgoKS5cbiAgICAoXywgcGFyYW0sIGlzT3B0aW9uYWwpID0-IHtcbiAgICAgICAgY29uc3QgdmFsdWUgPSBwYXJhbXMgPyBwYXJhbXNbcGFyYW1dIDogdW5kZWZpbmVkO1xuICAgICAgICBpZiAoaXNPcHRpb25hbCA9PSBudWxsICYmIHZhbHVlID09IG51bGwpIHtcbiAgICAgICAgICAgIHRocm93IG5ldyBFcnJvcihgUGF0aCAnJHtwYXRofScgcmVxdWlyZXMgcGFyYW0gJyR7cGFyYW19JyBidXQgaXQgd2FzIG5vdCBwcm92aWRlZGApO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB2YWx1ZSA9PSBudWxsID8gXCJcIiA6IFwiL1wiICsgdmFsdWU7XG4gICAgfSk7XG4gICAgaWYgKHBhdGguZW5kc1dpdGgoXCIqXCIpKSB7XG4gICAgICAgIC8vIHRyZWF0IHRyYWlsaW5nIHNwbGF0IHRoZSBzYW1lIHdheSBhcyBjb21waWxlUGF0aCwgYW5kIGZvcmNlIGl0IHRvIGJlIGFzIGlmIGl0IHdlcmUgYC8qYC5cbiAgICAgICAgLy8gYHJlYWN0LXJvdXRlciB0eXBlZ2VuYCB3aWxsIG5vdCBnZW5lcmF0ZSB0aGUgcGFyYW1zIGZvciBhIG1hbGZvcm1lZCBzcGxhdCwgY2F1c2luZyBhIHR5cGUgZXJyb3IsIGJ1dCB3ZSBjYW4gc3RpbGwgZG8gdGhlIGNvcnJlY3QgdGhpbmcgaGVyZS5cbiAgICAgICAgaWYgKHBhcmFtcyAmJiBwYXJhbXNbXCIqXCJdICE9IG51bGwpIHtcbiAgICAgICAgICAgIHJlc3VsdCArPSBcIi9cIiArIHBhcmFtc1tcIipcIl07XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdCB8fCBcIi9cIjtcbn1cblxucmV0dXJuIERBVEEgPSB7XG4gICAgaHJlZjEsXG4gICAgaHJlZjIsXG4gICAgaHJlZjNcbn07IiwiZ2xvYmFsVGVzdENvbmZpZyI6eyJkZXBlbmRlbmNpZXMiOltdfX19
 */
function trimEndSplat(path: string): string {
  let i = path.length - 1;
  let char = path[i];
  if (char !== "*" && char !== "/") {
    return path;
  }
  i--;
  for (; i >= 0; i--) {
    // for/break benchmarks faster than do/while
    if (path[i] !== "/") {
      break;
    }
  }
  return path.slice(0, i + 1);
}
