import traceback

def run_python_code(user_code: str, function_name: str, test_cases: list):
    results = []

    try:
        local_env = {}
        exec(user_code, {}, local_env)

        if function_name not in local_env:
            return {
                "success": False,
                "error": f"Function `{function_name}` not found in code"
            }

        func = local_env[function_name]

        for idx, test in enumerate(test_cases):
            try:
                output = func(**test["input"])
                passed = output == test["output"]

                results.append({
                    "testCase": idx + 1,
                    "expected": test["output"],
                    "received": output,
                    "passed": passed
                })
            except Exception as e:
                results.append({
                    "testCase": idx + 1,
                    "error": str(e),
                    "passed": False
                })

        all_passed = all(r["passed"] for r in results)

        return {
            "success": True,
            "allPassed": all_passed,
            "results": results
        }

    except Exception:
        return {
            "success": False,
            "error": traceback.format_exc()
        }
