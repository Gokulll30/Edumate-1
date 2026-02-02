import traceback

def run_python_code(user_code, function_name, test_cases):
    results = []

    local_env = {}

    try:
        # 1️⃣ Execute user code safely
        exec(user_code, {}, local_env)

        # 2️⃣ Ensure function exists
        if function_name not in local_env:
            return {
                "passed": False,
                "testResults": [],
                "error": f"Function '{function_name}' is not defined. Please define it exactly as required."
            }

        func = local_env[function_name]

        # 3️⃣ Run test cases
        for tc in test_cases:
            try:
                output = func(**tc["input"])
                passed = output == tc["output"]

                results.append({
                    "input": tc["input"],
                    "expected": tc["output"],
                    "actual": output,
                    "passed": passed
                })

            except Exception as e:
                results.append({
                    "input": tc["input"],
                    "expected": tc["output"],
                    "actual": str(e),
                    "passed": False
                })

        return {
            "passed": all(r["passed"] for r in results),
            "testResults": results
        }

    except Exception as e:
        return {
            "passed": False,
            "testResults": [],
            "error": str(e)
        }
